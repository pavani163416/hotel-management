import Booking from "../models/Booking.js";
import ServiceRequest from "../models/ServiceRequest.js";
import { sendNotification } from "../utils/notificationService.js";

const generateTicketId = () => {
  const suffix = Math.floor(Math.random() * 900 + 100);
  return `SR-${Date.now().toString().slice(-6)}-${suffix}`;
};

export const requestService = async (req, res, next) => {
  try {
    const { roomNumber, category, description } = req.body;
    const userId = req.user?.id || req.customer?.id || null;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    if (!roomNumber || !roomNumber.toString().trim()) {
      return res.status(400).json({ success: false, message: "Room number is required." });
    }

    if (!description || !description.toString().trim()) {
      return res.status(400).json({ success: false, message: "Please describe your request." });
    }

    const userEmail = req.user?.email?.toString().toLowerCase().trim();
    const guestId = req.user?.guestId || userId;

    const activeBookingConditions = [];
    if (guestId) {
      activeBookingConditions.push({ guest: guestId });
      activeBookingConditions.push({ "guestSnapshot.id": guestId.toString() });
    }
    if (userEmail) {
      activeBookingConditions.push({ "guestSnapshot.email": userEmail });
    }

    if (activeBookingConditions.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Unable to resolve guest identity for active booking lookup.",
      });
    }

    const activeBooking = await Booking.findOne({
      status: {
        $in: [
          "Confirmed",
          "confirmed",
          "CONFIRMED",
          "Pending",
          "pending",
          "PENDING_PAYMENT",
          "CheckedIn",
          "checkedin",
          "checked_in",
          "CHECKEDIN",
        ],
      },
      $or: activeBookingConditions,
    })
      .sort({ createdAt: -1 })
      .lean();

    if (!activeBooking) {
      return res.status(400).json({ success: false, message: "No active booking found for this user." });
    }

    const hotelId = activeBooking.hotelId || activeBooking.hotel || null;
    const ipAddress = req.headers["x-forwarded-for"]?.toString().split(",")[0]?.trim() || req.socket.remoteAddress || null;

    const serviceRequest = await ServiceRequest.create({
      ticketId: generateTicketId(),
      customerId: userId,
      bookingId: activeBooking._id,
      hotelId,
      roomNumber: roomNumber.toString().trim(),
      category: category || 'Housekeeping',
      description: description.toString().trim(),
      items: [],
      ipAddress,
      status: "Pending",
    });

    const serviceList = serviceRequest.items
      .map((item) => `- ${item.name} x${item.quantity}`)
      .join("<br>");

    const message = `New service request ${serviceRequest.ticketId} for ${serviceRequest.roomNumber}:<br>${serviceRequest.category}<br>${serviceRequest.description}<br>${serviceList}`;

    await sendNotification({
      hotelId,
      role: "Manager",
      message,
      type: "service_request",
    });

    res.status(201).json({
      success: true,
      message: "Service request submitted successfully.",
      data: serviceRequest,
    });
  } catch (error) {
    next(error);
  }
};

export const getManagerServiceRequests = async (req, res, next) => {
  try {
    const filter = {};
    if (req.scopedHotelId) filter.hotelId = req.scopedHotelId;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.category) filter.category = req.query.category;

    const requests = await ServiceRequest.find(filter)
      .sort({ createdAt: -1 })
      .populate("customerId", "name email")
      .lean();

    res.status(200).json({ success: true, data: requests });
  } catch (error) {
    next(error);
  }
};

export const updateServiceRequestStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowed = ["Pending", "In Progress", "Completed"];

    if (!status || !allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `status must be one of: ${allowed.join(", ")}`,
      });
    }

    const request = await ServiceRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: "Service request not found." });
    }

    if (req.scopedHotelId && request.hotelId?.toString() !== req.scopedHotelId?.toString()) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized: Service request does not belong to your hotel.",
      });
    }

    request.status = status;
    await request.save();

    res.status(200).json({ success: true, data: request });
  } catch (error) {
    next(error);
  }
};
