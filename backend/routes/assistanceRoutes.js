/**
 * assistanceRoutes.js
 * POST /api/assistance  { hotelId, userId, message }
 *
 * Flow:
 *  1. Find the hotel by hotelId
 *  2. Find the manager assigned to that hotel (Manager.assignedHotelId === hotelId)
 *  3. Store a Notification with role="manager", hotelId, userId, type="assistance"
 *  4. Emit a real-time Socket.IO event to the hotel room so the manager receives it instantly
 */

import express from "express";
import Hotel   from "../models/Hotel.js";
import Manager from "../models/Manager.js";
import { sendNotification } from "../utils/notificationService.js";
import logger from "../utils/logger.js";

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { hotelId, userId, message } = req.body;

    if (!hotelId || !userId || !message) {
      return res.status(400).json({
        success: false,
        message: "hotelId, userId and message are required.",
      });
    }

    // ── 1. Verify hotel exists ────────────────────────────
    const hotel = await Hotel.findOne({ hotelId: String(hotelId) });
    if (!hotel) {
      return res.status(404).json({ success: false, message: "Hotel not found." });
    }

    // ── 2. Find the manager assigned to this hotel ────────
    const manager = await Manager.findOne({
      assignedHotelId: String(hotelId),
      isActive: true,
    });

    const managerId = manager?._id?.toString() || null;

    // ── 3. Store notification + emit via Socket.IO ────────
    // sendNotification writes to DB and emits to hotel:<hotelId> room
    const notification = await sendNotification({
      userId:  String(userId).toLowerCase(),
      hotelId: String(hotelId),
      role:    "manager",
      message: `Assistance Request from ${userId}: ${message}`,
      type:    "assistance",
    });

    logger.info("Assistance request sent", {
      hotelId,
      userId,
      managerId,
      notificationId: notification?._id,
    });

    return res.status(201).json({
      success: true,
      message: "Assistance request sent to the hotel manager.",
      data: {
        notificationId: notification?._id,
        hotelId,
        managerId,
        hotelName: hotel.name,
      },
    });
  } catch (error) {
    logger.error("Assistance request failed", { error: error.message });
    return res.status(500).json({ success: false, message: "Failed to send assistance request." });
  }
});

export default router;
