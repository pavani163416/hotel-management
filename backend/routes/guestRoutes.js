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
import { getAllGuests, getGuestById, getAdditionalGuests } from "../controllers/guestController.js";

const router = express.Router();

router.get("/additional", getAdditionalGuests); // must be before /:id
router.get("/", getAllGuests);
router.get("/:id", getGuestById);

export default router;
