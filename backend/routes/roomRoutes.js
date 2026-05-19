import express from "express";
import {
  getRooms,
  getRoomById,
  createRoom,
  updateRoomStatus,
  deleteRoom,
  getMapOverview,
} from "../controllers/roomController.js";
import { countAvailableRooms } from "../services/roomAllocationService.js";
import { validateRoom, validateRoomStatus } from "../middleware/validators.js";
import Booking from "../models/Booking.js";
import Room   from "../models/Room.js";
import Hotel  from "../models/Hotel.js";
import mongoose from "mongoose";

const router = express.Router();

// ─────────────────────────────────────────────────────────
// GET /api/rooms/available-count
// Returns count of rooms available for a given type and date range.
// Used by the frontend "Only N rooms left" badge.
// Query: hotelStringId, roomType (optional), checkIn, checkOut
// ─────────────────────────────────────────────────────────
router.get("/available-count", async (req, res) => {
  try {
    const { hotelStringId, roomType, roomTypeId, checkIn, checkOut } = req.query;
    if (!checkIn || !checkOut) {
      return res.json({ success: true, available: null });
    }

    const { available, total } = await countAvailableRooms({
      hotelStringId,
      roomTypeId: roomTypeId || roomType,
      type: roomType,
      checkIn,
      checkOut,
    });

    return res.json({ success: true, available, total });
  } catch {
    return res.json({ success: true, available: null });
  }
});

router.get("/map-overview", getMapOverview);

// ─────────────────────────────────────────────────────────
// GET /api/rooms/booking-history/:roomId
// Returns recent bookings for a room (for the map drawer history panel).
// Query: limit (default 5)
// ─────────────────────────────────────────────────────────
router.get("/booking-history/:roomId", async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const limit = Math.min(20, parseInt(req.query.limit) || 5);

    if (!mongoose.Types.ObjectId.isValid(roomId)) {
      return res.status(400).json({ success: false, message: "Invalid roomId" });
    }

    const bookings = await Booking.find({ room: roomId })
      .populate("guest", "name email phone")
      .select("guestSnapshot checkIn checkOut status totalAmount nights paymentMethod createdAt")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({ success: true, count: bookings.length, data: bookings });
  } catch (e) { next(e); }
});

// POST /api/rooms/availability — check if a room is free for given dates
router.post("/availability", async (req, res) => {
  try {
    const { roomId, checkIn, checkOut } = req.body;
    if (!roomId || !checkIn || !checkOut) {
      return res.status(400).json({ available: false, message: "roomId, checkIn and checkOut are required." });
    }

    // Find the room by its string id (hotelRoom id) or ObjectId
    let room = null;
    if (mongoose.Types.ObjectId.isValid(roomId)) {
      room = await Room.findById(roomId);
    }
    if (!room) {
      room = await Room.findOne({ roomNumber: roomId, isActive: true });
    }

    if (!room) {
      const hotel = await Hotel.findOne({ "rooms.id": roomId, isActive: true });
      if (hotel) {
        const embedded = hotel.rooms.find((r) => r.id === roomId);
        if (embedded) {
          if ((embedded.available ?? 1) <= 0) {
            return res.json({ available: false, message: "This room is currently unavailable." });
          }
          return res.json({ available: true });
        }
      }
      return res.json({ available: true }); // room not in DB yet — allow
    }

    if (room.status === "Maintenance") {
      return res.json({ available: false, message: "This room is currently under maintenance." });
    }

    const overlap = await Booking.findOne({
      room:   room._id,
      status: { $in: ["Confirmed", "CheckedIn", "Pending"] },
      checkIn:  { $lt: new Date(checkOut) },
      checkOut: { $gt: new Date(checkIn) },
    });

    if (overlap) {
      return res.json({
        available: false,
        message: `Room is occupied until ${overlap.checkOut.toISOString().slice(0, 10)}. Please choose different dates or another room.`,
      });
    }

    return res.json({ available: true });
  } catch {
    return res.json({ available: true }); // fail open — let payment handle it
  }
});

// GET  /api/rooms          → list all available rooms (with optional filters)
// POST /api/rooms          → create a new room
router.route("/").get(getRooms).post(validateRoom, createRoom);

// GET    /api/rooms/:id    → get single room
// PATCH  /api/rooms/:id    → update room status
// DELETE /api/rooms/:id    → soft-delete room
router
  .route("/:id")
  .get(getRoomById)
  .patch(validateRoomStatus, updateRoomStatus)
  .delete(deleteRoom);

export default router;
