import express from "express";
import {
  createBooking,
  getAllBookings,
  getBookingById,
  cancelBooking,
} from "../controllers/bookingController.js";
import { validateBooking } from "../middleware/validators.js";
import { bookingLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

// GET  /api/bookings        → list all bookings
// POST /api/bookings        → create a new booking (rate limited)
router.get("/", getAllBookings);
router.post("/", validateBooking, bookingLimiter, createBooking);

// GET   /api/bookings/:id          → get single booking
router.route("/:id").get(getBookingById);

// PATCH /api/bookings/:id/cancel   → cancel a booking
router.patch("/:id/cancel", cancelBooking);

export default router;
