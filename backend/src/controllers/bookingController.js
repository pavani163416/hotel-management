import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Room from "../models/Room.js";
import RoomType from "../models/RoomType.js";
import Inventory from "../models/Inventory.js";
import Hotel from "../models/Hotel.js";
import Guest from "../models/Guest.js";
import AdditionalGuest from "../models/AdditionalGuest.js";
import CancellationRefund from "../models/CancellationRefund.js";
import Coupon from "../models/Coupon.js";
import { broadcastBookingUpdate } from "../routes/wsRoutes.js";
import { sendBookingConfirmation, sendCancellationEmail } from "../utils/emailService.js";
import { sendNotification } from "../utils/notificationService.js";
import logger from "../utils/logger.js";

// POST /api/bookings
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
      totalAmount,
      promoCode,
      paymentMethod,
      specialRequests,
      additionalAdults,
      additionalChildren,
    } = req.body;

    if (!roomId && !roomNumber && !roomTypeId) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: "roomId, roomNumber or roomTypeId is required" });
    }

    const startDate = new Date(checkIn);
    const endDate = new Date(checkOut);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || startDate >= endDate) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: "Invalid check-in or check-out dates" });
    }

    const dates = [];
    for (let d = new Date(startDate); d < endDate; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d));
    }

    // 1. Validate Room or RoomType
    let room = null;
    if (roomId && mongoose.Types.ObjectId.isValid(roomId)) {
      room = await Room.findById(roomId)
        .populate({ path: "roomTypeId", populate: { path: "hotelId", select: "name hotelId" } })
        .session(session);
    }

    if (!room && roomNumber) {
      room = await Room.findOne({ roomNumber, isActive: true })
        .populate({ path: "roomTypeId", populate: { path: "hotelId", select: "name hotelId" } })
        .session(session);
    }

    if (!room && roomTypeId) {
      room = await Room.findOne({ roomTypeId, isActive: true, status: "Available" })
        .populate({ path: "roomTypeId", populate: { path: "hotelId", select: "name hotelId" } })
        .session(session);

      if (!room) {
        room = await Room.findOne({ roomTypeId, isActive: true })
          .populate({ path: "roomTypeId", populate: { path: "hotelId", select: "name hotelId" } })
          .session(session);
      }
    }

    if (!room) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: "Room or room type not found" });
    }

    const roomType = room.roomTypeId;
    if (!roomType) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: "Associated room type metadata is missing" });
    }

    if (!room.isActive || room.status !== "Available") {
      await session.abortTransaction();
      return res.status(409).json({
        success: false,
        message: `Room ${room.roomNumber || room._id} is not available for booking.`,
      });
    }

    // 2. Check and Update Inventory for each date
    for (const date of dates) {
      const inventory = await Inventory.findOneAndUpdate(
        { roomTypeId: roomType._id, date },
        { $setOnInsert: { hotelId: roomType.hotelId._id, totalInventory: roomType.totalInventory } },
        { upsert: true, new: true, session }
      );

      if (inventory.bookedCount >= inventory.totalInventory) {
        await session.abortTransaction();
        return res.status(409).json({
          success: false,
          message: `Room type "${roomType.name}" is sold out for ${date.toISOString().slice(0, 10)}`,
        });
      }

      inventory.bookedCount += 1;
      await inventory.save({ session });
    }

    // 3. Upsert Guest
    const normalizedEmail = guestData.email?.toLowerCase().trim();
    let guest = await Guest.findOne({ email: normalizedEmail }).session(session);
    if (!guest) {
      [guest] = await Guest.create([{ ...guestData, email: normalizedEmail }], { session });
    }

    const nights = dates.length;
    const subtotal = room.pricePerNight * nights;
    const hotelStringId = room.hotelStringId || roomType.hotelId?.hotelId || null;
    const hotelName = roomType.hotelId?.name || room.hotelStringId || "";
    const hotelObjectId = roomType.hotelId?._id || room.hotelId || null;

    // 4. Create Booking
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
          checkIn: startDate,
          checkOut: endDate,
          nights,
          pricePerNight: room.pricePerNight,
          subtotal,
          totalAmount,
          paymentMethod: paymentMethod || "card",
          specialRequests: specialRequests || "",
          promoCode: promoCode?.toUpperCase?.() || null,
          hotelName,
          hotelStringId,
          hotelId: hotelObjectId,
          status: "Confirmed",
        },
      ],
      { session }
    );

    await Room.findByIdAndUpdate(room._id, { status: "Booked" }, { session });

    await session.commitTransaction();

    // Population for response
    const populated = await Booking.findById(booking._id)
      .populate("guest", "name email phone")
      .populate("room", "roomNumber type pricePerNight images hotelStringId");

    res.status(201).json({
      success: true,
      message: "Booking confirmed successfully",
      data: populated,
    });

    // Real-time updates & notifications (best effort)
    broadcastBookingUpdate(populated);
    sendBookingConfirmation({
      to: guestData.email,
      guestName: guestData.name,
      hotelName: roomType.hotelId.name,
      bookingRef: booking.bookingRef,
      checkIn,
      checkOut,
      totalAmount,
    }).catch(() => {});

  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

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
        .populate("room", "roomNumber type pricePerNight images")
        .populate("guest", "name email phone")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Booking.countDocuments(filter),
    ]);

    const data = bookings.map((b) => ({
      ...b.toJSON(),
      hotelName: b.hotelName || (b.room && b.room.type) || "LuxeStay",
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

export const getBookingById = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate("room", "roomNumber type pricePerNight images bedType amenities")
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
        to:           populatedForEmail.guest.email,
        guestName:    populatedForEmail.guest.name,
        hotelName:    booking.hotelName || "LuxeStay",
        bookingRef:   `LS-${booking._id.toString().slice(-5).toUpperCase()}`,
        roomType:     booking.roomType || "",
        checkIn:      booking.checkIn,
        checkOut:     booking.checkOut,
        nights:       booking.nights,
        totalAmount:  booking.totalAmount,
        refundAmount: booking.totalAmount,
        reason:       booking.cancellationReason,
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
      data: {
        ...booking.toObject(),
        bookingRef:   `LS-${booking._id.toString().slice(-5).toUpperCase()}`,
        refundAmount: booking.totalAmount,
        guestName:    populatedForEmail?.guest?.name  || booking.guestSnapshot?.name  || "Guest",
        guestEmail:   populatedForEmail?.guest?.email || booking.guestSnapshot?.email || "",
      },
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};
