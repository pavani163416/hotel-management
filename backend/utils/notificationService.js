import Notification from "../models/Notification.js";
import { sendFcmNotification } from "./fcmService.js";
import logger from "./logger.js";

let io = null;

export const setNotificationIo = (socketServer) => {
  io = socketServer;
};

export const roomNames = {
  user: (userId) => `user:${String(userId).toLowerCase()}`,
  hotel: (hotelId) => `hotel:${hotelId}`,
  role: (role) => `role:${String(role).toLowerCase()}`,
};

/**
 * Send a notification via Socket.IO (real-time web) AND FCM (mobile push).
 *
 * @param {object} opts
 * @param {string|null} opts.userId   - Target user email or id (customer only)
 * @param {string|null} opts.hotelId  - Target hotel id (manager scope)
 * @param {string}      opts.role     - "customer" | "manager" | "admin"
 * @param {string}      opts.message  - Notification message
 * @param {string}      [opts.type]   - Notification type (default: "system")
 */
export async function sendNotification({ userId = null, hotelId = null, role, message, type = "system" }) {
  if (!role || !message) return null;

  const notification = await Notification.create({
    userId: userId ? String(userId).toLowerCase() : null,
    hotelId: hotelId ? String(hotelId) : null,
    role: String(role).toLowerCase(),
    message,
    type,
    isRead: false,
  });

  const payload = notification.toJSON();

  // ── 1. Socket.IO (web frontend + admin) ──────────────
  if (io) {
    if (payload.role === "customer" && payload.userId) {
      io.to(roomNames.user(payload.userId)).emit("notification", payload);
    } else if (payload.role === "manager" && payload.hotelId) {
      io.to(roomNames.hotel(payload.hotelId)).emit("notification", payload);
    } else if (payload.role === "admin") {
      io.to(roomNames.role("admin")).emit("notification", payload);
    } else {
      let target = io;
      if (payload.userId)  target = target.to(roomNames.user(payload.userId));
      if (payload.hotelId) target = target.to(roomNames.hotel(payload.hotelId));
      if (payload.role)    target = target.to(roomNames.role(payload.role));
      target.emit("notification", payload);
    }
  }

  // ── 2. FCM push (mobile app) — customers only ────────
  if (payload.role === "customer") {
    try {
      // Lazy import to avoid circular deps at module load time
      const User = (await import("../models/User.js")).default;

      let fcmTokens = [];

      if (payload.userId) {
        // Target a specific user by email or _id
        const user = await User.findOne({
          $or: [
            { email: payload.userId.toLowerCase() },
            ...(payload.userId.match(/^[a-f\d]{24}$/i)
              ? [{ _id: payload.userId }]
              : []),
          ],
          fcmToken: { $ne: null, $exists: true },
          isActive: true,
        }).select("fcmToken");

        if (user?.fcmToken) fcmTokens = [user.fcmToken];
      } else {
        // Broadcast to ALL customers who have an FCM token
        const users = await User.find({
          role: "customer",
          fcmToken: { $ne: null, $exists: true },
          isActive: true,
        }).select("fcmToken");

        fcmTokens = users.map((u) => u.fcmToken).filter(Boolean);
      }

      if (fcmTokens.length > 0) {
        await sendFcmNotification(fcmTokens, "LuxeStay", message, { type, notificationId: String(notification._id) });
        logger.info(`FCM push sent to ${fcmTokens.length} device(s) for notification ${notification._id}`);
      }
    } catch (fcmErr) {
      // Non-blocking — don't fail the whole notification if FCM push fails
      logger.warn("FCM push failed (non-blocking)", { error: fcmErr.message });
    }
  }

  return notification;
}
