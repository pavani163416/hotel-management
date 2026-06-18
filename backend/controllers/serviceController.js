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

    // Find the user's active/latest booking using guestSnapshot.id or email and correct uppercase statuses
    const activeBooking = await Booking.findOne({
      $or: [
        { "guestSnapshot.id": userId },
        { "guestSnapshot.email": req.customer.email?.toLowerCase().trim() }
      ],
      status: { $in: ["Confirmed", "CheckedIn", "CONFIRMED"] }
    }).sort({ createdAt: -1 });

    if (!activeBooking) {
      return res.status(400).json({ success: false, message: "No active booking found for user" });
    }

    const hotelId = activeBooking.hotelStringId || (activeBooking.hotelId ? activeBooking.hotelId.toString() : null);

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
