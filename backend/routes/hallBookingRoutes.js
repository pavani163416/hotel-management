import express from "express";
import { requestHallBooking, getMyHallBookings, cancelMyHallBooking } from "../controllers/hallBookingController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// User Routes
router.post("/request", protect, requestHallBooking);
router.get("/my-requests", protect, getMyHallBookings);
router.patch("/:hallId/bookings/:bookingId/cancel", protect, cancelMyHallBooking);

export default router;
