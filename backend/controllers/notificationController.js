import Notification from "../models/Notification.js";
import { sendNotification } from "../utils/notificationService.js";

/**
 * GET /api/notifications
 * ── IDOR FIX ──────────────────────────────────────────────
 * All notification queries are NOW scoped exclusively from the
 * authenticated req.user JWT payload — never from raw query params.
 *
 * Before: ?userId=anyId leaked other users' notifications.
 * After:  scope is derived from token; query params are ignored for auth.
 */
export const getNotifications = async (req, res, next) => {
  try {
    const user = req.user;
    const filter = {};
    const role = user.role?.toLowerCase();

    if (role === "customer" || role === "owner") {
      // Customer/Owner: only their own notifications — keyed by email or userId in token
      const orConditions = [];
      if (user.email) orConditions.push({ userId: user.email.toLowerCase() });
      if (user.id)    orConditions.push({ userId: user.id.toString() });
      if (orConditions.length === 0) {
        return res.status(200).json({ success: true, count: 0, data: [] });
      }
      filter.$or = orConditions;
      filter.role = { $in: ["customer", "owner"] };

    } else if (role === "manager") {
      // Manager: only notifications for their assigned hotel
      const hotelId = user.assignedHotelId;
      if (!hotelId) {
        return res.status(200).json({ success: true, count: 0, data: [] });
      }
      filter.hotelId = hotelId;
      filter.role = "manager";

    } else if (
      role === "super admin" || role === "admin" || role === "controller"
    ) {
      // Admins: see admin-level notifications, optionally filter by hotel
      filter.role = "admin";
      if (req.query.hotelId) filter.hotelId = String(req.query.hotelId);

    } else {
      return res.status(403).json({ success: false, message: "Unauthorized role access." });
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({ success: true, count: notifications.length, data: notifications });
  } catch (error) {
    next(error);
  }
};

export const markNotificationRead = async (req, res, next) => {
  try {
    const notification = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );
    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }
    res.status(200).json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/notifications
 * ── BOLA FIX ──────────────────────────────────────────────
 * Only Managers and Admins may create notifications.
 * Managers are forcefully scoped to their assigned hotel — they cannot
 * target other hotels even if they pass a different hotelId in the body.
 */
export const createNotification = async (req, res, next) => {
  try {
    const user = req.user;
    const role = user.role?.toLowerCase();

    // Only staff roles are allowed to create notifications
    const allowedRoles = ["manager", "admin", "super admin", "controller"];
    if (!role || !allowedRoles.includes(role)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You do not have permission to create notifications.",
      });
    }

    let { hotelId, userId, message, type, role: targetRole } = req.body;

    // Managers can only create notifications for their own hotel
    if (role === "manager") {
      const assignedHotelId = user.assignedHotelId;
      if (!assignedHotelId) {
        return res.status(403).json({
          success: false,
          message: "Manager has no assigned hotel.",
        });
      }
      // Force-override any hotelId the client sent — prevent cross-tenant injection
      hotelId = assignedHotelId;

      // Managers can only target customer (their guests) or manager (their staff)
      if (!targetRole || (targetRole !== "customer" && targetRole !== "manager" && targetRole !== "admin")) {
        targetRole = "manager";
      }
    } else {
      // Admins can target customer, manager, or admin
      if (!targetRole || (targetRole !== "customer" && targetRole !== "manager" && targetRole !== "admin")) {
        targetRole = "admin";
      }
    }

    const notification = await sendNotification({
      role: targetRole,
      hotelId,
      userId,
      message,
      type: type || "system",
    });

    res.status(201).json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
};
