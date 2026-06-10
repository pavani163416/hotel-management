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

  // ── 2. FCM push (mobile app) — customers and owners ────────
  if (payload.role === "customer" || payload.role === "owner") {
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
        // Broadcast to ALL customers & owners who have an FCM token
        const users = await User.find({
          role: { $in: ["customer", "owner"] },
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

  // ── 3. Email broadcast (for newsletter subscribers / customer notifications) ──
  if (payload.role === "customer") {
    try {
      const { sendGeneralEmail } = await import("./emailService.js");
      const NewsletterSubscriber = (await import("../models/NewsletterSubscriber.js")).default;

      if (payload.userId) {
        let recipientEmail = null;
        if (payload.userId.includes("@")) {
          recipientEmail = payload.userId.toLowerCase();
        } else {
          const User = (await import("../models/User.js")).default;
          // Try fetching by ID
          if (payload.userId.match(/^[a-f\d]{24}$/i)) {
            const userObj = await User.findById(payload.userId).select("email");
            if (userObj?.email) {
              recipientEmail = userObj.email.toLowerCase();
            }
          }
        }

        if (recipientEmail) {
          await sendGeneralEmail({
            to: recipientEmail,
            subject: "LuxeStay Update",
            bodyHtml: message,
          });
        }
      } else {
        const subscribers = await NewsletterSubscriber.find().select("email");
        for (const sub of subscribers) {
          if (sub.email) {
            await sendGeneralEmail({
              to: sub.email,
              subject: "LuxeStay Update",
              bodyHtml: message,
            });
          }
        }
      }
    } catch (emailErr) {
      logger.warn("General/Newsletter email broadcast failed (non-blocking)", { error: emailErr.message });
    }
  }

  return notification;
}
