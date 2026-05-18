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
  getManagerStaff,
  createManagerStaff,
  deleteManagerStaff,
  getManagerTasks,
  createManagerTask,
  updateManagerTask,
} from "../controllers/managerController.js";
import { verifyManagerToken, isAssignedManager, scopeToHotel } from "../middleware/managerAuth.js";
import { authLimiter } from "../middleware/rateLimiter.js";

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

// ── Staff & Tasks ─────────────────────────────────────────
router.get("/staff",          ...protect, getManagerStaff);
router.post("/staff",         ...protect, createManagerStaff);
router.delete("/staff/:id",   ...protect, deleteManagerStaff);

router.get("/tasks",          ...protect, getManagerTasks);
router.post("/tasks",         ...protect, createManagerTask);
router.put("/tasks/:id",      ...protect, updateManagerTask);

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
