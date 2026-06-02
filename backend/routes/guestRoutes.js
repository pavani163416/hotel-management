/**
 * @swagger
 * tags:
 *   - name: Guests
 *     description: Guest records and lookup endpoints
 * /api/guests:
 *   get:
 *     summary: List all guests
 *     tags: [Guests]
 *     responses:
 *       200:
 *         description: Guest list returned
 * /api/guests/additional:
 *   get:
 *     summary: Get additional guest profiles
 *     tags: [Guests]
 *     responses:
 *       200:
 *         description: Additional guests returned
 * /api/guests/{id}:
 *   get:
 *     summary: Get a single guest by ID
 *     tags: [Guests]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Guest details returned
 */
import express from "express";
import { getAllGuests, getGuestById, getAdditionalGuests, createGuest } from "../controllers/guestController.js";
import { protect, authorizeRoles, validateOwnership, requireObjectId } from "../middleware/auth.js";

const router = express.Router();

router.use(protect); // Ensure all routes require authentication

// Global read access restricted to management/admin roles
router.get("/additional", authorizeRoles("Manager", "admin", "Super Admin", "Controller"), getAdditionalGuests);
router.get("/",  authorizeRoles("Manager", "admin", "Super Admin", "Controller"), getAllGuests);
router.post("/", authorizeRoles("admin", "Super Admin", "Controller"), createGuest);

// Specific guest profile fetch protected by multi-tenant ownership validation
router.get("/:id", requireObjectId(), validateOwnership("Guest"), getGuestById);

export default router;
