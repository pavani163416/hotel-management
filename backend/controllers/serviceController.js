import Booking from "../models/Booking.js";
import User from "../models/User.js";
import { sendNotification } from "../utils/notificationService.js";

export const requestService = async (req, res, next) => {
  try {
    const { services } = req.body;
    const userId = req.customer.id;

    if (!services || !services.length) {
      return res.status(400).json({ success: false, message: "No services requested" });
    }

    // Find the user's active/latest booking
    const activeBooking = await Booking.findOne({
      user: userId,
      status: { $in: ["confirmed", "checked_in"] }
    }).sort({ createdAt: -1 });

    if (!activeBooking) {
      return res.status(400).json({ success: false, message: "No active booking found for user" });
    }

    const hotelId = activeBooking.hotel;

    // Build the notification message
    const serviceList = services.map(s => `- ${s.name} x${s.quantity || 1}`).join("<br>");
    const message = `New Service Request for Booking ${activeBooking._id}:<br>${serviceList}`;

    // Send notification to the manager
    await sendNotification({
      hotelId: hotelId,
      role: "Manager",
      message: message,
      type: "service_request",
    });

    res.status(200).json({ success: true, message: "Service request submitted successfully" });
  } catch (error) {
    next(error);
  }
};
