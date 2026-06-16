import mongoose from "mongoose";
import jwt from "jsonwebtoken";
// Scoped dynamic room resolution and robust date overlap checkers
import Booking from "../models/Booking.js";
import Room from "../models/Room.js";
import Hotel from "../models/Hotel.js";
import Guest from "../models/Guest.js";
import AdditionalGuest from "../models/AdditionalGuest.js";
import CancellationRefund from "../models/CancellationRefund.js";
import Payment from "../models/Payment.js";
import Coupon from "../models/Coupon.js";
import AuditLog from "../models/AuditLog.js";
import { broadcastBookingUpdate } from "../routes/wsRoutes.js";
import { sendBookingConfirmation, sendCancellationEmail } from "../utils/emailService.js";
import { sendNotification } from "../utils/notificationService.js";
import logger from "../utils/logger.js";
import {
  findAvailableRoom,
  buildOverlapQuery,
  syncRoomLegacyStatus,
  NON_BOOKABLE_STATUSES,
  ACTIVE_BOOKING_STATUSES,
} from "../services/roomAllocationService.js";
import { acquireLock, releaseLock } from "../cache/redisCache.js";
import { enqueueEmailJob } from "../queues/emailQueue.js";

const nonCriticalCatch = (context, metadata) => (err) => {
  logger.warn(`Non-critical error in ${context}`, { error: err.message, ...metadata });
};

const inferBackendRoomType = (name = "") => {
  const normalized = String(name).toLowerCase();
  if (normalized.includes("penthouse")) return "Penthouse";
  if (normalized.includes("suite")) return "Suite";
  if (normalized.includes("villa")) return "Villa";
  if (normalized.includes("deluxe")) return "Deluxe";
  if (normalized.includes("-102") || normalized.includes("_102")) return "Suite";
  if (normalized.includes("-103") || normalized.includes("_103")) return "Penthouse";
  return "Standard";
};

const getOrCreateRoomFromHotelDefinition = async ({ identifier, hotelId, hotelName, price, description, capacity, bed, features, hotelImage }) => {
  if (!identifier) return null;

  let hotel = null;
  if (hotelId) hotel = await Hotel.findOne({ hotelId: hotelId, isActive: true });
  if (!hotel && hotelName) hotel = await Hotel.findOne({ name: hotelName, isActive: true });
  if (!hotel) hotel = await Hotel.findOne({ "rooms.id": identifier, isActive: true });
  if (!hotel) return null;

  let roomDef = hotel.rooms.find((room) => room.id === identifier || room.name === identifier);
  if (!roomDef) {
    const roomType = inferBackendRoomType(identifier);
    let cap = 2;
    let bedDesc = "1 King Bed";
    if (roomType === "Suite") { cap = 3; bedDesc = "1 King Bed + Sofa"; }
    else if (roomType === "Penthouse") { cap = 4; bedDesc = "2 King Beds"; }

    roomDef = {
      id: identifier,
      name: `${roomType} Room`,
      description: `${roomType} room at ${hotel.name}`,
      price: price || hotel.pricePerNight,
      capacity: cap,
      bed: bedDesc,
      available: 1,
      features: features || ["WiFi", "AC"]
    };
  }

  const existingRoom = await Room.findOne({ roomNumber: roomDef.id, hotelId: hotel._id });
  if (existingRoom) return existingRoom;

  const roomType = inferBackendRoomType(roomDef.name);
  const bedType = /queen/i.test(roomDef.bed)
    ? "Queen"
    : /king/i.test(roomDef.bed)
      ? "King"
      : /single/i.test(roomDef.bed)
        ? "Single"
        : /twin/i.test(roomDef.bed)
          ? "Twin"
          : "King";

  return await Room.create({
    hotelId:       hotel._id,
    hotelStringId: hotel.hotelId,
    roomNumber:    roomDef.id,
    roomTypeId:    roomDef.id,
    type:          roomType,
    description:   roomDef.description || description || "",
    pricePerNight: roomDef.price || price || 500,
    capacity:      roomDef.capacity || capacity || 2,
    bedType,
    amenities:     roomDef.features || features || [],
    images:        hotelImage ? [hotelImage] : [],
    status:        (roomDef.available ?? 1) > 0 ? "Available" : "Booked",
    isActive:      true,
  });
};

// ─────────────────────────────────────────────────────────
// POST /api/bookings
// Creates a booking atomically:
//   1. Verify room exists and is Available
//   2. Upsert guest record
//   3. Create booking document
//   4. Mark room as Booked
//   5. Link booking to guest
// All steps run inside a MongoDB session (transaction)
// ─────────────────────────────────────────────────────────
export const createBooking = async (req, res, next) => {
  // JWT is already parsed by the 'protect' middleware in the routes

  const { roomId, roomNumber, roomTypeId } = req.body;
  const targetRoomType = roomTypeId || roomId || roomNumber;
  if (!targetRoomType) {
    return res.status(400).json({
      success: false,
      message: "Room identifier is required"
    });
  }

  const lockKey = `room_lock_${targetRoomType}`;
  const lockValue = await acquireLock(lockKey, 10000);
  if (!lockValue) {
    return res.status(409).json({
      success: false,
      message: "Room is currently being booked by another user. Please try again in a few seconds.",
      code: "ROOM_LOCK_ACQUIRE_FAILED",
    });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      guest: guestData,
      checkIn,
      checkOut,
      pricePerNight,
      subtotal,
      taxes,
      discount,
      totalAmount,
      promoCode,
      paymentMethod,
      specialRequests,
      additionalAdults,
      additionalChildren,
    } = req.body;

    // Find correct actualHotel mapping matching hotelId or hotelName from request body
    let actualHotel = null;
    if (req.body.hotelId) {
      if (mongoose.Types.ObjectId.isValid(req.body.hotelId)) {
        actualHotel = await Hotel.findById(req.body.hotelId).session(session);
      }
      if (!actualHotel) {
        actualHotel = await Hotel.findOne({ hotelId: req.body.hotelId, isActive: true }).session(session);
      }
    }
    if (!actualHotel && req.body.hotelName) {
      actualHotel = await Hotel.findOne({ name: req.body.hotelName, isActive: true }).session(session);
    }

    // ── 1. Calculate dynamic capacity based on roomInventory ──
    if (actualHotel && actualHotel.roomInventory && targetRoomType) {
      const inv = actualHotel.roomInventory[targetRoomType] || actualHotel.roomInventory.get?.(targetRoomType);
      if (inv && typeof inv.total === "number") {
        const capacity = inv.total;
        
        // Write lock the hotel document to force serial execution of bookings for this hotel
        await Hotel.updateOne({ _id: actualHotel._id }, { $set: { updatedAt: new Date() } }).session(session);

        // Count active overlapping bookings
        const activeBookingsCount = await Booking.countDocuments({
          hotelId: actualHotel._id,
          roomType: targetRoomType,
          status: { $in: ACTIVE_BOOKING_STATUSES },
          checkIn: { $lt: new Date(checkOut) },
          checkOut: { $gt: new Date(checkIn) }
        }).session(session);

        if (activeBookingsCount >= capacity) {
          await session.abortTransaction();
          return res.status(409).json({
            success: false,
            message: "No rooms available",
            code: "NO_ROOMS_AVAILABLE"
          });
        }
      }
    }

    // ── 1. Auto-assign available physical room (date-based inventory) ──
    logger.debug(`Booking lookup: roomId="${roomId}", roomNumber="${roomNumber}", roomTypeId="${roomTypeId}", price=${pricePerNight}`);

    let room = await findAvailableRoom({
      hotelObjectId:  actualHotel?._id,
      hotelStringId:  actualHotel?.hotelId || req.body.hotelId,
      roomId,
      roomNumber,
      roomTypeId:     roomTypeId || roomId || roomNumber,
      pricePerNight,
      checkIn,
      checkOut,
    });

    if (!room) {
      await getOrCreateRoomFromHotelDefinition({
        identifier:   roomTypeId || roomId || roomNumber,
        hotelId:      req.body.hotelId,
        hotelName:    req.body.hotelName,
        price:        pricePerNight,
        description:  guestData?.description || "",
        capacity:     guestData?.capacity,
        bed:          guestData?.bed,
        features:     guestData?.features,
        hotelImage:   req.body.hotelImage || null,
      });
      room = await findAvailableRoom({
        hotelObjectId: actualHotel?._id,
        hotelStringId: actualHotel?.hotelId || req.body.hotelId,
        roomId,
        roomNumber,
        roomTypeId:    roomTypeId || roomId || roomNumber,
        pricePerNight,
        checkIn,
        checkOut,
      });
    }

    console.log(">>> RESOLVED ROOM:", room?._id, "STATUS:", room?.status);
    if (!room) {
      await session.abortTransaction();
      return res.status(409).json({
        success: false,
        message: "No Rooms Available for the selected dates. Please choose different dates or another room type.",
        code: "NO_ROOMS_AVAILABLE",
      });
    }

    const adultsCount = 1 + (additionalAdults?.length || 0);
    const childrenCount = additionalChildren?.length || 0;
    const totalGuests = adultsCount + childrenCount;

    const maxGuests = room.maxGuests || room.capacity || 4;
    const maxAdults = room.maxAdults || room.capacity || 2;
    const maxChildren = room.maxChildren != null ? room.maxChildren : 2;

    if (totalGuests > maxGuests) {
      await session.abortTransaction();
      return res.status(422).json({
        success: false,
        message: `This room only accommodates up to ${maxGuests} guests. You requested ${totalGuests}.`,
      });
    }
    if (adultsCount > maxAdults) {
      await session.abortTransaction();
      return res.status(422).json({
        success: false,
        message: `This room only accommodates up to ${maxAdults} adults. You requested ${adultsCount}.`,
      });
    }
    if (childrenCount > maxChildren) {
      await session.abortTransaction();
      return res.status(422).json({
        success: false,
        message: `This room only accommodates up to ${maxChildren} children. You requested ${childrenCount}.`,
      });
    }

    const activeBooking = await Booking.findOne(
      buildOverlapQuery(checkIn, checkOut, { room: room._id })
    ).session(session);
    if (activeBooking) {
      await session.abortTransaction();
      return res.status(409).json({
        success: false,
        message: `This room is already booked for these dates! (Occupied until ${activeBooking.checkOut.toISOString().slice(0, 10)})`,
        code: "ROOM_OVERLAP",
      });
    }

    // ── Normalize lead guest contact info ──
    const actualEmail = guestData.email.toLowerCase().trim();
    const normalizedEmail = actualEmail;

    const actualPhone = guestData.phone.trim();
    const normalizedPhone = actualPhone.replace(/[\s()\-]/g, "");

    // Removed guest overlapping booking check so a user can book multiple rooms

    if (NON_BOOKABLE_STATUSES.includes(room.status)) {
      await session.abortTransaction();
      return res.status(409).json({
        success: false,
        message: `Room is currently ${room.status} and cannot be booked`,
      });
    }

    // ── 2. Upsert guest (find by email or create new) ──
    let guest = await Guest.findOne({ email: normalizedEmail }).session(session);

    if (!guest) {
      [guest] = await Guest.create(
        [
          {
            name: guestData.name,
            email: normalizedEmail,
            phone: normalizedPhone,
            city: guestData.city || "",
          },
        ],
        { session }
      );
    }

    // ── 3. Create the booking ──────────────────────────
    let hotelImage = room.images?.[0] || "";
    if (!hotelImage && room.hotelId) {
      const hotel = await Hotel.findById(room.hotelId).session(session);
      hotelImage = hotel?.image || "";
    }
    if (!hotelImage && room.hotelStringId) {
      const hotel = await Hotel.findOne({ hotelId: room.hotelStringId, isActive: true }).session(session);
      hotelImage = hotel?.image || "";
    }

    // Determine booking status:
    // - Admin/Manager/Controller created bookings are auto-confirmed (no payment required)
    // - Cash payments are auto-confirmed
    // - Credit card payments require payment confirmation (Pending status)
    const userRole = req.user?.role?.toLowerCase() || "customer";
    const isStaffCreated = ["admin", "super admin", "controller", "manager"].includes(userRole);
    const isCashPayment = paymentMethod && paymentMethod.toLowerCase() === "cash";
    const bookingStatus = (isStaffCreated || isCashPayment) ? "Confirmed" : "Pending";
    const bookingPaymentStatus = (isStaffCreated || isCashPayment) ? "PAID" : "PENDING";

    const [booking] = await Booking.create(
      [
        {
          room: room._id,
          guest: guest._id,
          guestSnapshot: {
            name: guestData.name,
            email: actualEmail,
            phone: actualPhone,
            id: guestData.id,
          },
          additionalAdults: additionalAdults || [],
          additionalChildren: additionalChildren || [],
          totalGuests,
          checkIn: new Date(checkIn),
          checkOut: new Date(checkOut),
          pricePerNight,
          subtotal,
          taxes: taxes || 0,
          discount: discount || 0,
          promoCode: promoCode || null,
          totalAmount,
          paymentMethod: paymentMethod || "card",
          paymentStatus: bookingPaymentStatus,
          specialRequests: specialRequests ? String(specialRequests).replace(/</g, "&lt;").replace(/>/g, "&gt;") : "",
          hotelName: req.body.hotelName || resolveHotelName(room.roomNumber) || "",
          roomType: targetRoomType,
          hotelStringId: room.hotelStringId || null,
          hotelImage,
          hotelId: actualHotel ? actualHotel._id : (room.hotelId || null),
          status: bookingStatus,
        },
      ],
      { session }
    );

    // ── 4. Link booking to guest (availability = booking dates, not room.status) ──
    await Guest.findByIdAndUpdate(
      guest._id,
      { $push: { bookings: booking._id } },
      { session }
    );

    // ── 4.5 Mark room status as Booked ──
    await Room.findByIdAndUpdate(
      room._id,
      { status: "Booked" },
      { session }
    );

    // ── Commit everything ──────────────────────────────
    await session.commitTransaction();

    // Write audit log
    AuditLog.create({
      action: "BOOKING_CREATED",
      userId: guest.email || "anonymous",
      role: req.user?.role || "customer",
      ip: req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "127.0.0.1",
      details: {
        bookingId: booking._id,
        hotelName: booking.hotelName,
        roomType: booking.roomType,
        totalAmount: booking.totalAmount,
      }
    }).catch(() => {});

    // ── Update HotelSnapshot atomically (outside transaction, non-blocking) ──
    const resolvedHotelId = actualHotel ? actualHotel.hotelId : (room.hotelStringId || null);
    if (resolvedHotelId) {
      (async () => {
        try {
          const connectAdminDB = (await import("../config/adminDb.js")).default;
          const HotelSnapshotModel = (await import("../models/admin/HotelSnapshot.js")).default;
          const adminConn = await connectAdminDB();
          if (adminConn) {
            const HotelSnapshot = HotelSnapshotModel(adminConn);
            await HotelSnapshot.findOneAndUpdate(
              { hotelId: resolvedHotelId },
              { $inc: { activeBookings: 1, ytdRevenue: totalAmount } }
            );
          }
        } catch (e) {
          logger.warn("Failed to atomic inc HotelSnapshot", { error: e.message });
        }
      })();
    }

    // ── Auto-reset legacy Booked flags for past checkouts (background) ──
    Booking.find({
      status: { $in: ["Confirmed", "CheckedIn"] },
      checkOut: { $lt: new Date() },
    }).then(async (pastBookings) => {
      for (const pb of pastBookings) {
        await syncRoomLegacyStatus(pb.room).catch(() => {});
        await Booking.findByIdAndUpdate(pb._id, { status: "CheckedOut" }).catch(() => {});
      }
    }).catch(() => {});

    // ── Increment coupon usedCount (best-effort, outside transaction) ──
    if (promoCode && typeof promoCode === "string") {
      Coupon.findOneAndUpdate(
        { code: promoCode.toUpperCase().trim() },
        { $inc: { usedCount: 1 } }
      ).catch(() => {});
    }

    // ── Save additional guests to AdditionalGuest collection ──
    // (outside transaction — best effort, non-blocking)
    if ((additionalAdults?.length || additionalChildren?.length)) {
      AdditionalGuest.create({
        bookingId:      booking._id,
        leadGuestId:    guest._id,
        leadGuestName:  guestData.name,
        leadGuestEmail: guestData.email,
        adults:         additionalAdults || [],
        children:       additionalChildren || [],
        roomNumber:     room.roomNumber,
        checkIn:        new Date(checkIn),
        checkOut:       new Date(checkOut),
      }).catch(() => {}); // never block the response
    }

    // Populate for the response
    const populated = await Booking.findById(booking._id)
      .populate("room", "roomNumber type pricePerNight images")
      .populate("guest", "name email phone");

    res.status(201).json({
      success: true,
      message: "Booking confirmed successfully",
      data: {
        ...populated.toJSON(),
        bookingRef: populated.bookingRef,
      },
    });

    // Broadcast new booking to admin panels (after response sent)
    const bookingPayload = {
      ...populated.toJSON(),
      hotelName: req.body.hotelName || resolveHotelName(populated.room?.roomNumber || ""),
    };
    broadcastBookingUpdate(bookingPayload);

    // ── EVENT 1 – BOOKING CREATED ──
    // Notify User
    sendNotification({
      userId: guestData.email,
      role: "customer",
      message: (booking.status === "Confirmed" || booking.status === "CONFIRMED")
        ? "Booking Confirmed"
        : "Your booking is created and awaiting payment confirmation.",
      type: "booking",
    }).catch(() => {});

    // Notify Admin
    sendNotification({
      role: "admin",
      message: `New booking created: ${booking.bookingRef}`,
      type: "booking",
    }).catch(() => {});

    // Notify Manager
    sendNotification({
      hotelId: room.hotelStringId || room.hotelId?.toString() || null,
      role: "manager",
      message: `New booking created: ${booking.bookingRef}`,
      type: "booking",
    }).catch(() => {});

    // Emit Socket.IO event for real-time admin dashboard update
    const io = req.app.get("io");
    if (io) {
      const userRoom = `user:${booking.userId || booking.guestSnapshot?.id || booking.guest}`;
      let targetEmitter = io.to(userRoom);
      if (booking.guestSnapshot?.email) {
        targetEmitter = targetEmitter.to(`user:${booking.guestSnapshot.email.toLowerCase()}`);
      }
      targetEmitter = targetEmitter
        .to("role:admin")
        .to("role:super admin")
        .to("role:controller");
      if (booking.hotelStringId) {
        targetEmitter = targetEmitter.to(`hotel:${booking.hotelStringId}`);
      }
      if (booking.hotelId) {
        targetEmitter = targetEmitter.to(`hotel:${booking.hotelId}`);
      }

      // Only emit newBooking (live alert) for confirmed bookings
      if (booking.status === "Confirmed" || booking.status === "CONFIRMED") {
        targetEmitter.emit("newBooking", {
          bookingId: booking._id,
          hotelName: bookingPayload.hotelName,
          userName: guestData.name,
          amount: totalAmount,
          roomType: room.type,
          status: booking.status,
          createdAt: new Date().toISOString(),
        });
      }
      io.emit("roomStatusUpdate", {
        roomId: room._id,
        roomNumber: room.roomNumber,
        hotelStringId: room.hotelStringId,
      });
      targetEmitter.emit("booking_update", { _id: booking._id, status: booking.status, roomId: room._id });
    }

    // Send confirmation email
    if (booking.status === "Confirmed" || booking.status === "CONFIRMED") {
      sendBookingConfirmation({
        to:          guestData.email,
        guestName:   guestData.name,
        hotelName:   req.body.hotelName || resolveHotelName(room.roomNumber) || "Unknown Hotel",
        bookingRef:  `LS-${booking._id.toString().slice(-5).toUpperCase()}`,
        checkIn,
        checkOut,
        nights:      booking.nights,
        roomType:    room.type,
        totalAmount,
      }).then(() => {
        logger.info(`Booking confirmation email sent`, { to: guestData.email });
      }).catch((err) => {
        logger.warn(`Booking confirmation email failed`, { to: guestData.email, error: err.message });
      });
    }
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    next(error);
  } finally {
    session.endSession();
    if (lockKey && lockValue) {
      await releaseLock(lockKey, lockValue);
    }
  }
};

// Map room number prefix → hotel name (mirrors frontend logic)
const HOTEL_INITIALS = {
  hdl: "Hôtel de Lumière", tas: "The Azure Skyline", cbr: "Coral Bay Resort",
  apl: "Alpine Peak Lodge", tgm: "The Grand Metropolitan", scs: "Santorini Cliff Suites",
};
const HOTEL_IDS = {
  h1: "Hôtel de Lumière", h2: "The Azure Skyline", h3: "Coral Bay Resort",
  h4: "Alpine Peak Lodge", h5: "The Grand Metropolitan", h6: "Santorini Cliff Suites",
};

function resolveHotelName(roomNumber = "") {
  const prefix = roomNumber.split("-")[0]?.toLowerCase();
  if (HOTEL_INITIALS[prefix]) return HOTEL_INITIALS[prefix];
  const legacy = roomNumber.split("_")[0]?.toLowerCase();
  return HOTEL_IDS[legacy] || "";
}

// ─────────────────────────────────────────────────────────
// GET /api/bookings?page=1&limit=20&status=Confirmed&guestEmail=...
// Paginated booking list
// ─────────────────────────────────────────────────────────
export const getAllBookings = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const { status, guestEmail } = req.query;
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(500, parseInt(req.query.limit) || 20);
    const skip  = (page - 1) * limit;

    const filter = {};
    if (status) filter.status = status;

    if (req.user.role === "customer") {
      const userEmail = req.user.email?.toLowerCase().trim() || "";
      let guestIds = [];
      if (userEmail) {
        const matchingGuests = await Guest.find({ email: userEmail });
        guestIds = matchingGuests.map(g => g._id);
      }
      if (req.user.guestId && mongoose.Types.ObjectId.isValid(req.user.guestId)) {
        const tokenGuestId = new mongoose.Types.ObjectId(req.user.guestId);
        if (!guestIds.some(id => id.equals(tokenGuestId))) {
          guestIds.push(tokenGuestId);
        }
      }
      if (guestIds.length === 0 && !userEmail) {
        return res.status(200).json({ success: true, count: 0, total: 0, page, pages: 0, data: [] });
      }
      filter.$or = [
        { guest: { $in: guestIds } },
        { "guestSnapshot.email": userEmail }
      ];
    } else if (req.user.role === "Manager") {
      const managerHotelId = req.user.assignedHotelId;
      const managerHotelObjId = req.user.hotelObjectId;
      const orConditions = [];
      if (managerHotelId) orConditions.push({ hotelStringId: managerHotelId });
      if (managerHotelObjId) orConditions.push({ hotelId: managerHotelObjId });
      
      if (orConditions.length > 0) {
        filter.$or = orConditions;
      } else {
        return res.status(200).json({ success: true, count: 0, total: 0, page, pages: 0, data: [] });
      }
    } else if (req.user.role === "admin" || req.user.role === "Super Admin" || req.user.role === "Controller") {
      if (guestEmail) {
        const normalEmail = String(guestEmail).toLowerCase().trim();
        const guest = await Guest.findOne({ email: normalEmail });
        if (guest) {
          filter.guest = guest._id;
        } else {
          filter["guestSnapshot.email"] = normalEmail;
        }
      }
    } else {
      return res.status(403).json({ success: false, message: "Unauthorized role access." });
    }

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate("room",  "roomNumber type pricePerNight images hotelStringId")
        .populate("guest", "name email phone")
        .populate("hotelId", "name image")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Booking.countDocuments(filter),
    ]);

    const data = bookings.map((b) => ({
      ...b.toJSON(),
      hotelName: b.hotelId?.name || b.hotelName || resolveHotelName(b.room?.roomNumber || "") || "Other Properties",
      hotelImage: b.hotelId?.image || b.hotelImage || b.room?.images?.[0] || "",
    }));

    res.status(200).json({
      success: true,
      count:   data.length,
      total,
      page,
      pages:   Math.ceil(total / limit),
      data,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// GET /api/bookings/:id
// Returns a single booking by ID
// ─────────────────────────────────────────────────────────
export const getBookingById = async (req, res, next) => {
  if (!req.user && !req.customer) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  try {
    const booking = await Booking.findById(req.params.id)
      .populate("room", "roomNumber type pricePerNight images amenities")
      .populate("guest", "name email phone city")
      .populate("hotelId", "name image");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    const currentUser = req.user || req.customer;
    if (currentUser.role !== "admin" && currentUser.role !== "Super Admin" && currentUser.role !== "Controller" && currentUser.role !== "Manager") {
      if (booking.guest?.id !== currentUser.id && booking.guestSnapshot?.email !== currentUser.email && booking.guestSnapshot?.id !== currentUser.guestId) {
        return res.status(403).json({ success: false, message: "Unauthorized: You do not own this booking." });
      }
    }

    const response = booking.toJSON();
    response.hotelImage = booking.hotelId?.image || response.hotelImage || booking.room?.images?.[0] || "";

    // Fetch additional guests stored in the AdditionalGuest collection
    const additionalGuestRecord = await AdditionalGuest.findOne({ bookingId: booking._id });
    
    // Merge from both collections to ensure we don't overwrite with empty arrays
    response.additionalAdults   = additionalGuestRecord?.adults?.length ? additionalGuestRecord.adults : (booking.additionalAdults || []);
    response.additionalChildren = additionalGuestRecord?.children?.length ? additionalGuestRecord.children : (booking.additionalChildren || []);

    res.status(200).json({ success: true, data: response });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// PATCH /api/bookings/:id/cancel
// Cancels a booking and frees the room atomically
// ─────────────────────────────────────────────────────────
export const cancelBooking = async (req, res, next) => {
  if (!req.user && !req.customer) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  try {
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    const currentUser = req.user || req.customer;
    if (currentUser.role !== "admin" && currentUser.role !== "Super Admin" && currentUser.role !== "Controller" && currentUser.role !== "Manager") {
      if (booking.guest?.toString() !== currentUser.id && booking.guestSnapshot?.email !== currentUser.email && booking.guestSnapshot?.id !== currentUser.guestId) {
        return res.status(403).json({ success: false, message: "Unauthorized: You do not own this booking." });
      }
    }

    if (booking.status === "Cancelled") {
      return res.status(400).json({
        success: false,
        message: "Booking is already cancelled",
      });
    }

    // Cancel the booking
    booking.status = "Cancelled";
    booking.cancelledAt = new Date();
    booking.cancellationReason = req.body.reason || "Cancelled by guest";
    await booking.save();

    // Update pending payment records to "CANCELLED" for consistency
    const paymentUpdateResult = await Payment.updateMany(
      { bookingId: booking._id, status: "PENDING" },
      { status: "CANCELLED", cancelledAt: new Date() }
    ).catch(err => {
      logger.warn("Failed to update payment status on booking cancellation", { error: err.message });
      return null;
    });

    if (paymentUpdateResult?.modifiedCount > 0 && booking.paymentStatus === "PENDING") {
      booking.paymentStatus = "FAILED";
      await booking.save();
    }

    // Write audit log
    AuditLog.create({
      action: "BOOKING_CANCELLED",
      userId: booking.guestSnapshot?.email || "unknown",
      role: currentUser?.role || "customer",
      ip: req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "127.0.0.1",
      details: {
        bookingId: booking._id,
        reason: booking.cancellationReason,
      }
    }).catch(() => {});

    // ── Update HotelSnapshot atomically (outside transaction, non-blocking) ──
    if (booking.hotelStringId) {
      (async () => {
        try {
          const connectAdminDB = (await import("../config/adminDb.js")).default;
          const HotelSnapshotModel = (await import("../models/admin/HotelSnapshot.js")).default;
          const adminConn = await connectAdminDB();
          if (adminConn) {
            const HotelSnapshot = HotelSnapshotModel(adminConn);
            await HotelSnapshot.findOneAndUpdate(
              { hotelId: booking.hotelStringId },
              { $inc: { activeBookings: -1, ytdRevenue: -booking.totalAmount } }
            );
          }
        } catch (e) {
          logger.warn("Failed to atomic dec HotelSnapshot", { error: e.message });
        }
      })();
    }

    await syncRoomLegacyStatus(booking.room);

    const io = req.app?.get?.("io");
    if (io) {
      const userRoom = `user:${booking.userId || booking.guestSnapshot?.id || booking.guest}`;
      let targetEmitter = io.to(userRoom);
      if (booking.guestSnapshot?.email) {
        targetEmitter = targetEmitter.to(`user:${booking.guestSnapshot.email.toLowerCase()}`);
      }
      targetEmitter = targetEmitter
        .to("role:admin")
        .to("role:super admin")
        .to("role:controller");
      if (booking.hotelStringId) {
        targetEmitter = targetEmitter.to(`hotel:${booking.hotelStringId}`);
      }
      if (booking.hotelId) {
        targetEmitter = targetEmitter.to(`hotel:${booking.hotelId}`);
      }

      io.emit("roomStatusUpdate", { roomId: booking.room, hotelStringId: booking.hotelStringId });
      targetEmitter.emit("booking_update", { _id: booking._id, status: "Cancelled" });
    }

    // ── Create CancellationRefund record ──────────────
    const populatedForRefund = await Booking.findById(booking._id)
      .populate("guest", "name email")
      .populate("room", "roomNumber");
    CancellationRefund.create({
      bookingId:      booking._id,
      bookingRef:     `LS-${booking._id.toString().slice(-5).toUpperCase()}`,
      guestName:      populatedForRefund?.guest?.name || booking.guestSnapshot?.name || "Guest",
      guestEmail:     populatedForRefund?.guest?.email || booking.guestSnapshot?.email || "",
      hotelName:      booking.hotelName || "",
      roomNumber:     populatedForRefund?.room?.roomNumber || "",
      checkIn:        booking.checkIn,
      checkOut:       booking.checkOut,
      nights:         booking.nights,
      originalAmount: booking.totalAmount,
      refundAmount:   booking.totalAmount,   // full refund by default
      refundPct:      100,
      cancelledBy:    req.body.cancelledBy || "guest",
      cancelledAt:    booking.cancelledAt,
      reason:         booking.cancellationReason,
      refundStatus:   "pending",
      refundMethod:   booking.paymentMethod || "card",
    }).catch((err) => logger.warn("CancellationRefund create failed", { error: err.message }));
    broadcastBookingUpdate({
      _id: booking._id,
      status: "Cancelled",
      cancellationReason: booking.cancellationReason,
    });

    // Send cancellation email & notification (non-blocking)
    const populatedForEmail = await Booking.findById(booking._id)
      .populate("guest", "name email")
      .populate("room", "hotelStringId hotelId");
    if (populatedForEmail) {
      const recipientEmails = new Set();
      if (populatedForEmail.guest?.email && !populatedForEmail.guest.email.includes("@placeholder.com")) {
        recipientEmails.add(populatedForEmail.guest.email.toLowerCase().trim());
      }
      if (booking.guestSnapshot?.email) {
        recipientEmails.add(booking.guestSnapshot.email.toLowerCase().trim());
      }
      if (req.customer?.email) {
        recipientEmails.add(req.customer.email.toLowerCase().trim());
      }

      for (const email of recipientEmails) {
        sendNotification({
          userId: email,
          role: "customer",
          message: `Your booking for ${booking.hotelName || "LuxeStay"} has been cancelled.`,
          type: "booking",
        }).catch(nonCriticalCatch("cancellationNotification", { bookingId: booking._id }));

        const cancellationEmailPayload = {
          to:        email,
          guestName: populatedForEmail.guest?.name || booking.guestSnapshot?.name || "Guest",
          hotelName: booking.hotelName || "LuxeStay",
          bookingRef: `LS-${booking._id.toString().slice(-5).toUpperCase()}`,
          reason:    booking.cancellationReason,
        };
        const cancellationEmailJob = await enqueueEmailJob("cancellationEmail", cancellationEmailPayload);
        if (!cancellationEmailJob) {
          sendCancellationEmail(cancellationEmailPayload).catch(nonCriticalCatch("cancellationEmail", { bookingId: booking._id }));
        }
      }
    }
    sendNotification({
      hotelId: populatedForEmail?.room?.hotelStringId || populatedForEmail?.room?.hotelId?.toString() || null,
      role: "manager",
      message: "A booking has been cancelled",
      type: "booking",
    }).catch(() => {});

    res.status(200).json({
      success: true,
      message: "Booking cancelled and room is now available",
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};
