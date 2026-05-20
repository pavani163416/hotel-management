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
