/**
 * @swagger
 * tags:
 *   - name: Visitors
 *     description: Visitor tracking and conversion endpoints
 * /api/visitors/track:
 *   post:
 *     summary: Track a visitor session
 *     tags: [Visitors]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               page:
 *                 type: string
 *               sessionId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Visitor tracked
 * /api/visitors/convert:
 *   patch:
 *     summary: Mark a visitor session as converted
 *     tags: [Visitors]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Visitor converted
 * /api/visitors/{id}:
 *   patch:
 *     summary: Update a visitor session record
 *     tags: [Visitors]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Visitor record updated
 * /api/visitors:
 *   get:
 *     summary: Get tracked visitor sessions
 *     tags: [Visitors]
 *     responses:
 *       200:
 *         description: Visitor sessions returned
 */
import express from "express";
import { trackVisitor, updateVisitor, convertVisitor, getVisitors } from "../controllers/visitorController.js";
import { protect, authorizeRoles } from "../middleware/auth.js";

const router = express.Router();

router.post("/track",    trackVisitor);   // user panel → track page visit
router.patch("/convert", convertVisitor); // user panel → mark session as Converted
router.patch("/:id",     updateVisitor);  // user panel → update duration on leave

// Restrict read access to admins
router.get("/", protect, authorizeRoles("admin", "Super Admin", "Controller"), getVisitors);

export default router;
