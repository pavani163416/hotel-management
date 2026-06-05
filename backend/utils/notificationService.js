import Notification from "../models/Notification.js";

let io = null;

export const setNotificationIo = (socketServer) => {
  io = socketServer;
};

export const roomNames = {
  user: (userId) => `user:${String(userId).toLowerCase()}`,
  hotel: (hotelId) => `hotel:${hotelId}`,
  role: (role) => `role:${String(role).toLowerCase()}`,
};

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
  if (io) {
    if (payload.role === "customer" && payload.userId) {
      io.to(roomNames.user(payload.userId)).emit("notification", payload);
    } else if (payload.role === "manager" && payload.hotelId) {
      io.to(roomNames.hotel(payload.hotelId)).emit("notification", payload);
    } else if (payload.role === "admin") {
      io.to(roomNames.role("admin")).emit("notification", payload);
    } else {
      let target = io;
      if (payload.userId) target = target.to(roomNames.user(payload.userId));
      if (payload.hotelId) target = target.to(roomNames.hotel(payload.hotelId));
      if (payload.role) target = target.to(roomNames.role(payload.role));
      target.emit("notification", payload);
    }
  }

  return notification;
}
