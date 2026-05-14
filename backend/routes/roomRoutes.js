import express from "express";
import {
  getRooms,
  getRoomById,
  createRoom,
  updateRoomStatus,
  deleteRoom,
} from "../controllers/roomController.js";
import { validateRoom, validateRoomStatus } from "../middleware/validators.js";
import Booking from "../models/Booking.js";
import Room   from "../models/Room.js";
import mongoose from "mongoose";

const router = express.Router();

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
      return res.json({ available: true }); // room not in DB yet — allow
    }

    if (room.status === "Maintenance") {
      return res.json({ available: false, message: "This room is currently under maintenance." });
    }

    if (room.status === "Booked") {
      // Check if there's an active booking that overlaps with requested dates
      const overlap = await Booking.findOne({
        room:   room._id,
        status: { $in: ["Confirmed", "CheckedIn"] },
        checkIn:  { $lt: new Date(checkOut) },
        checkOut: { $gt: new Date(checkIn) },
      });

      if (overlap) {
        return res.json({
          available: false,
          message: `Room is occupied until ${overlap.checkOut.toISOString().slice(0, 10)}. Please choose different dates or another room.`,
        });
      }
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
