/**
 * @swagger
 * tags:
 *   - name: Manager
 *     description: Manager panel endpoints for hotel staff and operations
 * /api/manager/login:
 *   post:
 *     summary: Authenticate a manager and return a JWT
 *     tags: [Manager]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Manager authenticated successfully
 * /api/manager/dashboard:
 *   get:
 *     summary: Get dashboard summary data for the logged in manager
 *     tags: [Manager]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data returned
 * /api/manager/stats:
 *   get:
 *     summary: Get statistics for the manager's hotel
 *     tags: [Manager]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Manager stats returned
 * /api/manager/rooms:
 *   get:
 *     summary: List manager-scoped rooms
 *     tags: [Manager]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Room list returned
 *   post:
 *     summary: Create a new room for the manager's hotel
 *     tags: [Manager]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ManagerRoom'
 *     responses:
 *       201:
 *         description: Room created successfully
 * /api/manager/rooms/{id}:
 *   put:
 *     summary: Update a room managed by the authenticated manager
 *     tags: [Manager]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ManagerRoom'
 *     responses:
 *       200:
 *         description: Room updated successfully
 *   delete:
 *     summary: Delete a room managed by the authenticated manager
 *     tags: [Manager]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Room deleted successfully
 * /api/manager/rooms/{id}/availability:
 *   get:
 *     summary: Check room availability for manager-managed rooms
 *     tags: [Manager]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *       - name: checkIn
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *       - name: checkOut
 *         in: query
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: Availability status returned
 * /api/manager/bookings:
 *   get:
 *     summary: List bookings for the manager's hotel
 *     tags: [Manager]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Booking list returned
 * /api/manager/bookings/{id}/checkin:
 *   put:
 *     summary: Mark a booking as checked in
 *     tags: [Manager]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking checked in
 * /api/manager/bookings/{id}/checkout:
 *   put:
 *     summary: Mark a booking as checked out
 *     tags: [Manager]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Booking checked out
 * /api/manager/bookings/walkin:
 *   post:
 *     summary: Create a walk-in booking for the manager's hotel
 *     tags: [Manager]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateBooking'
 *     responses:
 *       201:
 *         description: Walk-in booking created
 * /api/manager/bookings/{id}/reassign:
 *   put:
 *     summary: Reassign a booking to another room
 *     tags: [Manager]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BillingReassignRequest'
 *     responses:
 *       200:
 *         description: Booking reassigned successfully
 * /api/manager/guests:
 *   get:
 *     summary: Get guests associated with the manager's hotel
 *     tags: [Manager]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Guest list returned
 * /api/manager/guests/additional:
 *   get:
 *     summary: Get additional guest records for manager hotel
 *     tags: [Manager]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Additional guests returned
 * /api/manager/halls:
 *   get:
 *     summary: List function halls for manager hotel
 *     tags: [Manager]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Function halls returned
 *   post:
 *     summary: Create a new function hall entry
 *     tags: [Manager]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               hallType:
 *                 type: string
 *               capacity:
 *                 type: integer
 *               description:
 *                 type: string
 *     responses:
 *       201:
 *         description: Function hall created successfully
 * /api/manager/halls/{id}:
 *   put:
 *     summary: Update a function hall by ID
 *     tags: [Manager]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Function hall updated successfully
 * /api/manager/price-requests:
 *   get:
 *     summary: List price requests for the manager hotel
 *     tags: [Manager]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Price requests returned
 *   post:
 *     summary: Create a price request for a room
 *     tags: [Manager]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePriceRequest'
 *     responses:
 *       201:
 *         description: Price request created successfully
 */

import express from "express";
import {
  managerLogin,
  getManagerDashboard,
  getManagerStats,
  getManagerRooms,
  getManagerMapOverview,
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
import { validateLoginPayload } from "../middleware/authValidator.js";
import { validate, schemas } from "../middleware/zodValidation.js";
import { requireObjectId } from "../middleware/auth.js";
import Room    from "../models/Room.js";
import Booking from "../models/Booking.js";

const HOTEL_PREFIXES = { h1: "hdl", h2: "tas", h3: "cbr", h4: "apl", h5: "tgm", h6: "scs", h7: "swg" };

const roomBelongsToHotel = (room, manager) => {
  if (!room || !manager) return false;
  const assignedHotelId = String(manager.assignedHotelId || "").toLowerCase();
  const assignedHotelObjectId = String(manager.hotelObjectId || "").toLowerCase();
  const roomHotelId = String(room.hotelStringId || "").toLowerCase();
  const roomObjectId = String(room.hotelId || "").toLowerCase();
  if (assignedHotelId && roomHotelId === assignedHotelId) return true;
  if (assignedHotelObjectId && roomObjectId === assignedHotelObjectId) return true;
  const prefix = HOTEL_PREFIXES[assignedHotelId];
  if (prefix && String(room.roomNumber || "").toLowerCase().startsWith(prefix + "-")) return true;
  return false;
};

const router = express.Router();

// ── Public ────────────────────────────────────────────────
router.post("/login", authLimiter, validateLoginPayload, managerLogin);

// ── Protected middleware chain ────────────────────────────
const protect = [verifyManagerToken, scopeToHotel];

// ── Dashboard ─────────────────────────────────────────────
router.get("/dashboard", ...protect, getManagerDashboard);
router.get("/stats",     ...protect, getManagerStats);

// ── Rooms (full CRUD, hotel-scoped) ──────────────────────
router.get("/rooms",        ...protect, getManagerRooms);
router.get("/rooms/map-overview", ...protect, getManagerMapOverview);
router.post("/rooms",       ...protect, validate(schemas.createRoom), createManagerRoom);
router.put("/rooms/:id",    ...protect, isAssignedManager, requireObjectId(), validate(schemas.updateRoom), updateManagerRoom);
router.delete("/rooms/:id", ...protect, isAssignedManager, requireObjectId(), deleteManagerRoom);

// ── Room availability check (date-based) ─────────────────
// GET /api/manager/rooms/:id/availability?checkIn=&checkOut=
router.get("/rooms/:id/availability", ...protect, isAssignedManager, requireObjectId(), async (req, res, next) => {
  try {
    const { checkIn, checkOut } = req.query;
    if (!checkIn || !checkOut) {
      return res.status(400).json({ success: false, message: "checkIn and checkOut are required" });
    }
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ success: false, message: "Room not found" });
    if (req.manager?.role === "Manager" && !roomBelongsToHotel(room, req.manager)) {
      return res.status(403).json({ success: false, message: "Unauthorized: This room does not belong to your hotel.", code: "HOTEL_ACCESS_DENIED" });
    }

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
router.put("/bookings/:id/reassign", ...protect, isAssignedManager, requireObjectId(), async (req, res, next) => {
  try {
    const { newRoomId } = req.body;
    if (!newRoomId) return res.status(400).json({ success: false, message: "newRoomId is required" });

    const booking = await Booking.findById(req.params.id).populate("room");
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    if (["Cancelled", "CheckedOut", "Completed"].includes(booking.status)) {
      return res.status(400).json({ success: false, message: "Cannot reassign a completed or cancelled booking" });
    }
    if (req.manager?.role === "Manager") {
      const bookingHotelId = String(booking.hotelStringId || "").toLowerCase();
      const assignedHotelId = String(req.manager.assignedHotelId || "").toLowerCase();
      const prefix = HOTEL_PREFIXES[assignedHotelId];
      const bookingRoomNumber = String(booking.room?.roomNumber || "").toLowerCase();
      const bookingMatchesHotel = bookingHotelId === assignedHotelId || (prefix && bookingRoomNumber.startsWith(prefix + "-"));
      if (!bookingMatchesHotel) {
        return res.status(403).json({ success: false, message: "Unauthorized: This booking does not belong to your hotel.", code: "HOTEL_ACCESS_DENIED" });
      }
    }

    const newRoom = await Room.findById(newRoomId);
    if (!newRoom) return res.status(404).json({ success: false, message: "Target room not found" });
    if (req.manager?.role === "Manager" && !roomBelongsToHotel(newRoom, req.manager)) {
      return res.status(403).json({ success: false, message: "Unauthorized: Target room does not belong to your hotel.", code: "HOTEL_ACCESS_DENIED" });
    }
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
router.post("/bookings/walkin",        ...protect, validate(schemas.walkInBooking), createWalkInBooking);
router.get("/bookings",                ...protect, getManagerBookings);
router.put("/bookings/:id/checkin",    ...protect, requireObjectId(), checkInBooking);
router.put("/bookings/:id/checkout",   ...protect, requireObjectId(), checkOutBooking);

// ── Guests ────────────────────────────────────────────────
router.get("/guests/additional", ...protect, getManagerAdditionalGuests); // before /:id
router.get("/guests",            ...protect, getManagerGuests);

// ── Function Halls ────────────────────────────────────────
router.get("/halls",        ...protect, getManagerHalls);
router.post("/halls",       ...protect, createManagerHall);
router.put("/halls/:id",    ...protect, requireObjectId(), updateManagerHall);

// ── Price Requests ────────────────────────────────────────
router.post("/price-requests", ...protect, validate(schemas.createPriceRequest), createPriceRequest);
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
