import Notification from "../models/Notification.js";
import { sendNotification } from "../utils/notificationService.js";

const buildFilter = (query) => {
  const role = String(query.role || "").toLowerCase();
  const filter = {};

  if (role) filter.role = role;

  if (role === "customer") {
    if (!query.userId) return null;
    filter.userId = String(query.userId).toLowerCase();
  } else if (role === "manager") {
    if (query.hotelId) filter.hotelId = String(query.hotelId);
    // Allow seeing global manager notifications if no hotelId matches exactly
    // but typically we want to stay within the hotel scope.
  } else if (role === "admin") {
    filter.role = "admin";
  } else {
    if (query.userId) filter.userId = String(query.userId).toLowerCase();
    if (query.hotelId) filter.hotelId = String(query.hotelId);
  }

  return filter;
};

export const getNotifications = async (req, res, next) => {
  try {
    const filter = buildFilter(req.query);
    if (!filter) {
      return res.status(400).json({ success: false, message: "Notification scope is required" });
    }
    const notifications = await Notification.find(filter).sort({ createdAt: -1 }).limit(50);
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

export const createNotification = async (req, res, next) => {
  try {
    const { role, hotelId, userId, message, type } = req.body;
    const notification = await sendNotification({
      role,
      hotelId,
      userId,
      message,
      type: type || "assistance",
    });

    res.status(201).json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
};
