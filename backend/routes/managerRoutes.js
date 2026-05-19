/**
 * managerRoutes.js
 * All routes prefixed with /api/manager
 *
 * Public:
 *   POST /api/manager/login
 *
 * Protected (requires valid manager JWT):
 *   GET  /api/manager/dashboard
 *   GET  /api/manager/stats
 *   GET  /api/manager/rooms
 *   POST /api/manager/rooms
 *   PUT  /api/manager/rooms/:id
 *   DELETE /api/manager/rooms/:id
 *   GET  /api/manager/bookings
 *   PUT  /api/manager/bookings/:id/checkin
 *   PUT  /api/manager/bookings/:id/checkout
 *   POST /api/manager/bookings/walkin
 *   GET  /api/manager/guests
 *   GET  /api/manager/guests/additional
 *   GET  /api/manager/halls
 *   POST /api/manager/halls
 *   PUT  /api/manager/halls/:id
 *   POST /api/manager/price-requests
 *   GET  /api/manager/price-requests
 *   GET  /api/manager/hotel/:hotelId  (access guard)
 */

import express from "express";
import {
  managerLogin,
  getManagerDashboard,
  getManagerStats,
  getManagerRooms,
  createManagerRoom,
  updateManagerRoom,
  deleteManagerRoom,
  getManagerBookings,
  checkInBooking,
  checkOutBooking,
  createWalkInBooking,
  getManagerGuests,
  getManagerAdditionalGuests,
  getManagerHalls,
  createManagerHall,
  updateManagerHall,
  createPriceRequest,
  getManagerPriceRequests,
} from "../controllers/managerController.js";
import { verifyManagerToken, isAssignedManager, scopeToHotel } from "../middleware/managerAuth.js";
import { authLimiter } from "../middleware/rateLimiter.js";
import Room    from "../models/Room.js";
import Booking from "../models/Booking.js";

const router = express.Router();

// ── Public ────────────────────────────────────────────────
router.post("/login", authLimiter, managerLogin);

// ── Protected middleware chain ────────────────────────────
const protect = [verifyManagerToken, scopeToHotel];

// ── Dashboard ─────────────────────────────────────────────
router.get("/dashboard", ...protect, getManagerDashboard);
router.get("/stats",     ...protect, getManagerStats);

// ── Rooms (full CRUD, hotel-scoped) ──────────────────────
router.get("/rooms",        ...protect, getManagerRooms);
router.post("/rooms",       ...protect, createManagerRoom);
router.put("/rooms/:id",    ...protect, isAssignedManager, updateManagerRoom);
router.delete("/rooms/:id", ...protect, isAssignedManager, deleteManagerRoom);

// ── Room availability check (date-based) ─────────────────
// GET /api/manager/rooms/:id/availability?checkIn=&checkOut=
router.get("/rooms/:id/availability", ...protect, async (req, res, next) => {
  try {
    const { checkIn, checkOut } = req.query;
    if (!checkIn || !checkOut) {
      return res.status(400).json({ success: false, message: "checkIn and checkOut are required" });
    }
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ success: false, message: "Room not found" });

    const overlap = await Booking.findOne({
      room:     room._id,
      status:   { $in: ["Confirmed", "CheckedIn"] },
      checkIn:  { $lt: new Date(checkOut) },
      checkOut: { $gt: new Date(checkIn) },
    }).populate("guest", "name email phone").lean();

    res.json({
      success:   true,
      available: !overlap,
      booking:   overlap || null,
    });
  } catch (e) { next(e); }
});

// ── Room reassignment ─────────────────────────────────────
// PUT /api/manager/bookings/:id/reassign  { newRoomId }
router.put("/bookings/:id/reassign", ...protect, async (req, res, next) => {
  try {
    const { newRoomId } = req.body;
    if (!newRoomId) return res.status(400).json({ success: false, message: "newRoomId is required" });

    const booking = await Booking.findById(req.params.id).populate("room");
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    if (["Cancelled", "CheckedOut", "Completed"].includes(booking.status)) {
      return res.status(400).json({ success: false, message: "Cannot reassign a completed or cancelled booking" });
    }

    const newRoom = await Room.findById(newRoomId);
    if (!newRoom) return res.status(404).json({ success: false, message: "Target room not found" });
    if (newRoom.status === "Maintenance" || newRoom.status === "Blocked") {
      return res.status(409).json({ success: false, message: `Room is ${newRoom.status} and cannot be assigned` });
    }

    // Check date overlap on new room
    const overlap = await Booking.findOne({
      _id:      { $ne: booking._id },
      room:     newRoom._id,
      status:   { $in: ["Confirmed", "CheckedIn"] },
      checkIn:  { $lt: booking.checkOut },
      checkOut: { $gt: booking.checkIn },
    });
    if (overlap) {
      return res.status(409).json({
        success: false,
        message: `Room ${newRoom.roomNumber} is already booked for overlapping dates`,
      });
    }

    // Free old room if no other active bookings on it
    const oldRoomId = booking.room?._id;
    if (oldRoomId && String(oldRoomId) !== String(newRoom._id)) {
      const otherBookings = await Booking.countDocuments({
        _id:    { $ne: booking._id },
        room:   oldRoomId,
        status: { $in: ["Confirmed", "CheckedIn"] },
      });
      if (otherBookings === 0) {
        await Room.findByIdAndUpdate(oldRoomId, { status: "Available" });
      }
    }

    // Assign new room
    booking.room = newRoom._id;
    await booking.save();
    await Room.findByIdAndUpdate(newRoom._id, { status: "Booked" });

    const io = req.app.get("io");
    if (io) io.emit("roomStatusUpdate", { roomId: newRoom._id, roomNumber: newRoom.roomNumber, status: "Booked" });

    res.json({ success: true, message: `Booking moved to room ${newRoom.roomNumber}`, data: booking });
  } catch (e) { next(e); }
});

// ── Bookings ──────────────────────────────────────────────
// NOTE: /walkin must be before /:id to avoid route conflict
router.post("/bookings/walkin",        ...protect, createWalkInBooking);
router.get("/bookings",                ...protect, getManagerBookings);
router.put("/bookings/:id/checkin",    ...protect, checkInBooking);
router.put("/bookings/:id/checkout",   ...protect, checkOutBooking);

// ── Guests ────────────────────────────────────────────────
router.get("/guests/additional", ...protect, getManagerAdditionalGuests); // before /:id
router.get("/guests",            ...protect, getManagerGuests);

// ── Function Halls ────────────────────────────────────────
router.get("/halls",        ...protect, getManagerHalls);
router.post("/halls",       ...protect, createManagerHall);
router.put("/halls/:id",    ...protect, updateManagerHall);

// ── Price Requests ────────────────────────────────────────
router.post("/price-requests", ...protect, createPriceRequest);
router.get("/price-requests",  ...protect, getManagerPriceRequests);

// ── Hotel access guard (for hotel switcher) ───────────────
router.get("/hotel/:hotelId", ...protect, isAssignedManager, (req, res) => {
  res.status(200).json({
    success: true,
    message: "Access granted",
    data: {
      hotelId:   req.manager.assignedHotelId,
      hotelName: req.manager.assignedHotelName,
    },
  });
});

export default router;
