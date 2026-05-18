import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Room from "../models/Room.js";
import Guest from "../models/Guest.js";
import AdditionalGuest from "../models/AdditionalGuest.js";
import CancellationRefund from "../models/CancellationRefund.js";
import Coupon from "../models/Coupon.js";
import { broadcastBookingUpdate } from "../routes/wsRoutes.js";
import { sendBookingConfirmation, sendCancellationEmail } from "../utils/emailService.js";
import { sendNotification } from "../utils/notificationService.js";
import logger from "../utils/logger.js";

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
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      roomId,
      roomNumber,
      roomTypeId,
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

    // ── 1. Validate room availability ──────────────────
    let room = null;
    logger.debug(`Booking lookup: roomId="${roomId}", roomNumber="${roomNumber}", roomTypeId="${roomTypeId}", price=${pricePerNight}`);

    if (mongoose.Types.ObjectId.isValid(roomId)) {
      room = await Room.findById(roomId).session(session);
    }

    if (!room && roomNumber) {
      room = await Room.findOne({ roomNumber: String(roomNumber).trim(), isActive: true }).session(session);
    }

    if (!room && roomId) {
      room = await Room.findOne({ roomNumber: roomId, isActive: true }).session(session);
    }

    if (!room && roomTypeId && roomTypeId !== roomId) {
      room = await Room.findOne({ roomNumber: roomTypeId, isActive: true }).session(session);
    }

    // Last resort: match by price
    if (!room && pricePerNight) {
      room = await Room.findOne({
        isActive: true,
        status: "Available",
        pricePerNight: Number(pricePerNight),
      }).session(session);
    }

    logger.debug(`Room found: ${room ? room.roomNumber + " (" + room.status + ")" : "NOT FOUND"}`);

    if (!room) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: `Room "${roomId}" not found. Run: cd backend && node utils/seedRooms.js`,
      });
    }

    if (room.status !== "Available") {
      // If the room is Booked, only block dates that overlap an active booking.
      if (room.status === "Booked") {
        const activeBooking = await Booking.findOne({
          room: room._id,
          status: { $in: ["Confirmed", "CheckedIn"] },
          checkIn:  { $lt: new Date(checkOut) },
          checkOut: { $gt: new Date(checkIn) },
        }).session(session);

        if (!activeBooking) {
          // No overlap for the requested stay — allow this booking.
        } else {
          await session.abortTransaction();
          return res.status(409).json({
            success: false,
            message: `Room is currently occupied until ${activeBooking.checkOut.toISOString().slice(0, 10)}. Please choose different dates or another room.`,
          });
        }
      } else {
        await session.abortTransaction();
        return res.status(409).json({
          success: false,
          message: `Room is currently ${room.status} and cannot be booked`,
        });
      }
    }

    // ── 2. Upsert guest (find by email or create new) ──
    const normalizedEmail = guestData.email?.toLowerCase().trim() || guestData.email;
    let guest = await Guest.findOne({ email: normalizedEmail }).session(session);

    if (!guest) {
      [guest] = await Guest.create(
        [
          {
            name: guestData.name,
            email: normalizedEmail,
            phone: guestData.phone,
            city: guestData.city || "",
          },
        ],
        { session }
      );
    }

    // ── 3. Create the booking ──────────────────────────
    const [booking] = await Booking.create(
      [
        {
          room: room._id,
          guest: guest._id,
          guestSnapshot: {
            name: guestData.name,
            email: normalizedEmail,
            phone: guestData.phone,
          },
          additionalAdults: additionalAdults || [],
          additionalChildren: additionalChildren || [],
          checkIn: new Date(checkIn),
          checkOut: new Date(checkOut),
          pricePerNight,
          subtotal,
          taxes: taxes || 0,
          discount: discount || 0,
          promoCode: promoCode || null,
          totalAmount,
          paymentMethod: paymentMethod || "card",
          specialRequests: specialRequests || "",
          hotelName: req.body.hotelName || resolveHotelName(room.roomNumber),
          hotelId: room.hotelId || null,
          status: "Confirmed",
        },
      ],
      { session }
    );

    // ── 4. Mark room as Booked ─────────────────────────
    await Room.findByIdAndUpdate(
      room._id,
      { status: "Booked" },
      { session }
    );

    // ── 5. Link booking to guest ───────────────────────
    await Guest.findByIdAndUpdate(
      guest._id,
      { $push: { bookings: booking._id } },
      { session }
    );

    // ── Commit everything ──────────────────────────────
    await session.commitTransaction();

    // ── Auto-reset rooms with past checkout dates (background cleanup) ──
    Booking.find({
      status: { $in: ["Confirmed", "CheckedIn"] },
      checkOut: { $lt: new Date() },
    }).then(async (pastBookings) => {
      for (const pb of pastBookings) {
        await Room.findByIdAndUpdate(pb.room, { status: "Available" }).catch(() => {});
        await Booking.findByIdAndUpdate(pb._id, { status: "CheckedOut" }).catch(() => {});
      }
    }).catch(() => {});

    // ── Increment coupon usedCount (best-effort, outside transaction) ──
    if (promoCode) {
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

    sendNotification({
      hotelId: room.hotelStringId || room.hotelId?.toString() || null,
      role: "manager",
      message: "New booking received",
      type: "booking",
    }).catch(() => {});
    sendNotification({
      userId: guestData.email,
      role: "customer",
      message: "Your booking is confirmed",
      type: "booking",
    }).catch(() => {});

    // Emit Socket.IO event for real-time admin dashboard update
    const io = req.app.get("io");
    if (io) {
      io.emit("newBooking", {
        bookingId: booking._id,
        hotelName: bookingPayload.hotelName,
        userName: guestData.name,
        amount: totalAmount,
        roomType: room.type,
        status: "Confirmed",
        createdAt: new Date().toISOString(),
      });
    }

    // Send confirmation email
    sendBookingConfirmation({
      to:          guestData.email,
      guestName:   guestData.name,
      hotelName:   req.body.hotelName || resolveHotelName(room.roomNumber),
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
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
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
  return HOTEL_IDS[legacy] || "LuxeStay";
}

// ─────────────────────────────────────────────────────────
// GET /api/bookings?page=1&limit=20&status=Confirmed&guestEmail=...
// Paginated booking list
// ─────────────────────────────────────────────────────────
export const getAllBookings = async (req, res, next) => {
  try {
    const { status, guestEmail } = req.query;
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const skip  = (page - 1) * limit;

    const filter = {};
    if (status) filter.status = status;
    if (guestEmail) {
      const normalEmail = String(guestEmail).toLowerCase().trim();
      const guest = await Guest.findOne({ email: normalEmail });
      if (guest) {
        filter.guest = guest._id;
      } else {
        // Fallback: search by guestSnapshot.email (covers cases where guest record differs)
        filter["guestSnapshot.email"] = normalEmail;
      }
    }

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate("room",  "roomNumber type pricePerNight images hotelStringId")
        .populate("guest", "name email phone")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Booking.countDocuments(filter),
    ]);

    const data = bookings.map((b) => ({
      ...b.toJSON(),
      hotelName: b.hotelName || resolveHotelName(b.room?.roomNumber || "") || "LuxeStay",
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
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("room", "roomNumber type pricePerNight images amenities")
      .populate("guest", "name email phone city");

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// PATCH /api/bookings/:id/cancel
// Cancels a booking and frees the room atomically
// ─────────────────────────────────────────────────────────
export const cancelBooking = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const booking = await Booking.findById(req.params.id).session(session);

    if (!booking) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (booking.status === "Cancelled") {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Booking is already cancelled",
      });
    }

    // Cancel the booking
    booking.status = "Cancelled";
    booking.cancelledAt = new Date();
    booking.cancellationReason = req.body.reason || "Cancelled by guest";
    await booking.save({ session });

    // Free the room
    await Room.findByIdAndUpdate(
      booking.room,
      { status: "Available" },
      { session }
    );

    await session.commitTransaction();

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

    // Send cancellation email (non-blocking)
    const populatedForEmail = await Booking.findById(booking._id)
      .populate("guest", "name email")
      .populate("room", "hotelStringId hotelId");
    if (populatedForEmail?.guest) {
      sendNotification({
        userId: populatedForEmail.guest.email,
        role: "customer",
        message: "Your booking has been cancelled",
        type: "booking",
      }).catch(() => {});
      sendCancellationEmail({
        to:        populatedForEmail.guest.email,
        guestName: populatedForEmail.guest.name,
        hotelName: booking.hotelName || "LuxeStay",
        bookingRef: `LS-${booking._id.toString().slice(-5).toUpperCase()}`,
        reason:    booking.cancellationReason,
      }).catch(() => {});
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
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};
