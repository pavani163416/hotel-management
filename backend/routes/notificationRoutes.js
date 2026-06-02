/**
 * @swagger
 * tags:
 *   - name: Notifications
 *     description: Notification read and creation endpoints
 * /api/notifications:
 *   get:
 *     summary: List notifications for the current user
 *     tags: [Notifications]
 *     responses:
 *       200:
 *         description: Notifications returned
 *   post:
 *     summary: Create a new notification
 *     tags: [Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Notification'
 *     responses:
 *       201:
 *         description: Notification created
 * /api/notifications/{id}/read:
 *   put:
 *     summary: Mark a notification as read
 *     tags: [Notifications]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification marked read
 */
import express from "express";
import { getNotifications, markNotificationRead, createNotification } from "../controllers/notificationController.js";
import { protect, authorizeRoles, validateOwnership, requireObjectId } from "../middleware/auth.js";

const router = express.Router();

router.use(protect); // All routes require authentication

router.get("/", getNotifications);

// POST /notifications — ONLY admin/manager roles can create notifications
// Prevents phishing: customers cannot send fake system notifications to arbitrary userIds
router.post(
  "/",
  authorizeRoles("admin", "Super Admin", "Controller", "Manager", "manager"),
  createNotification
);

router.put("/:id/read", requireObjectId(), validateOwnership("Notification"), markNotificationRead);

export default router;
