/**
 * @swagger
 * tags:
 *   - name: Bookings
 *     description: Booking creation and management endpoints
 * /api/bookings:
 *   get:
 *     summary: List all bookings
 *     tags: [Bookings]
 *     responses:
 *       200:
 *         description: Booking list returned
 *   post:
 *     summary: Create a new booking
 *     tags: [Bookings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateBooking'
 *     responses:
 *       201:
 *         description: Booking created successfully
 * /api/bookings/{id}:
 *   get:
 *     summary: Get a single booking by ID
 *     tags: [Bookings]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking details returned
 *   patch:
 *     summary: Cancel a booking by ID
 *     tags: [Bookings]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking cancelled successfully
 */
import express from "express";
import {
  createBooking,
  getAllBookings,
  getBookingById,
  cancelBooking,
} from "../controllers/bookingController.js";
import { validateBooking } from "../middleware/validators.js";
import { bookingLimiter } from "../middleware/rateLimiter.js";
import { protect, validateOwnership, requireObjectId } from "../middleware/auth.js";

const router = express.Router();

// GET  /api/bookings        → list all bookings (protected, filtered by role)
// POST /api/bookings        → create a new booking (requires auth + rate limited)
router.get("/", protect, getAllBookings);
router.post("/", protect, validateBooking, bookingLimiter, createBooking);

// GET   /api/bookings/:id          → get single booking (validated ownership)
router.route("/:id").get(protect, requireObjectId(), validateOwnership("Booking"), getBookingById);

// PATCH /api/bookings/:id/cancel   → cancel a booking (validated ownership)
router.patch("/:id/cancel", protect, requireObjectId(), validateOwnership("Booking"), cancelBooking);

export default router;
