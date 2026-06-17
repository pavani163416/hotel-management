import express from "express";
import {
  joinWaitlist,
  getMyWaitlists,
  cancelWaitlist,
  getHotelWaitlists,
  getAllWaitlists,
  notifyNextWaitlist
} from "../controllers/waitlistController.js";
import { protect, authorizeRoles, checkBannedAndLocked } from "../middleware/auth.js";

const router = express.Router();

/**
 * @swagger
 * /api/waitlist/join:
 *   post:
 *     summary: Join the waitlist for a hotel
 *     tags: [Waitlist]
 *     security:
 *       - bearerAuth: []
 */
router.post("/join", protect, checkBannedAndLocked, joinWaitlist);

/**
 * @swagger
 * /api/waitlist/my:
 *   get:
 *     summary: Get user's waitlists
 *     tags: [Waitlist]
 *     security:
 *       - bearerAuth: []
 */
router.get("/my", protect, checkBannedAndLocked, getMyWaitlists);

/**
 * @swagger
 * /api/waitlist/cancel/{id}:
 *   delete:
 *     summary: Cancel a waitlist entry
 *     tags: [Waitlist]
 *     security:
 *       - bearerAuth: []
 */
router.delete("/cancel/:id", protect, checkBannedAndLocked, cancelWaitlist);

// --- Admin & Owner Routes ---

/**
 * @swagger
 * /api/waitlist/hotel/{hotelId}:
 *   get:
 *     summary: Get waitlists for a specific hotel (Owner/Admin)
 *     tags: [Waitlist Admin]
 *     security:
 *       - bearerAuth: []
 */
router.get("/hotel/:hotelId", protect, authorizeRoles("owner", "admin", "super admin"), getHotelWaitlists);

/**
 * @swagger
 * /api/waitlist/admin:
 *   get:
 *     summary: Get all waitlists (Admin only)
 *     tags: [Waitlist Admin]
 *     security:
 *       - bearerAuth: []
 */
router.get("/admin", protect, authorizeRoles("admin", "super admin"), getAllWaitlists);

/**
 * @swagger
 * /api/waitlist/notify/{hotelId}:
 *   post:
 *     summary: Manually notify the next person in line
 *     tags: [Waitlist Admin]
 *     security:
 *       - bearerAuth: []
 */
router.post("/notify/:hotelId", protect, authorizeRoles("owner", "admin", "super admin"), notifyNextWaitlist);

export default router;
