import FunctionHall from "../models/FunctionHall.js";
import Hotel from "../models/Hotel.js";
import { sendNotification } from "../utils/notificationService.js";

// @desc    Create a new hall booking request
// @route   POST /api/halls/request
// @access  Private (User)
export const requestHallBooking = async (req, res, next) => {
  try {
    const { hallId, eventName, date, startTime, endTime, capacity, notes } = req.body;

    const hall = await FunctionHall.findById(hallId);
    if (!hall) return res.status(404).json({ success: false, message: "Function Hall not found" });

    const newBooking = {
      eventName,
      organizer: req.user.name,
      organizerEmail: req.user.email,
      userId: req.user._id,
      date,
      startTime,
      endTime,
      capacity,
      notes,
      status: "Pending",
    };

    hall.bookings.push(newBooking);
    await hall.save();

    // Notify Manager/Admin
    await sendNotification({
      hotelId: hall.hotelId || hall.hotelStringId,
      role: "manager",
      message: `A user requested ${eventName} in ${hall.name}`,
      type: "booking",
    }).catch(err => console.error("Manager Notify Error:", err.message));

    res.status(201).json({ success: true, data: hall.bookings[hall.bookings.length - 1] });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's hall bookings
// @route   GET /api/halls/my-requests
// @access  Private (User)
export const getMyHallBookings = async (req, res, next) => {
  try {
    // Find all halls that have a booking by this user
    const halls = await FunctionHall.find({ "bookings.userId": req.user._id });
    
    let userBookings = [];
    halls.forEach((hall) => {
      const bks = hall.bookings.filter(b => b.userId && b.userId.toString() === req.user._id.toString());
      bks.forEach(b => {
        userBookings.push({
          ...b.toObject(),
          hallName: hall.name,
          hotelName: hall.hotelName,
          hallId: hall._id,
        });
      });
    });

    // Sort descending by bookedAt
    userBookings.sort((a, b) => new Date(b.bookedAt) - new Date(a.bookedAt));

    res.status(200).json({ success: true, count: userBookings.length, data: userBookings });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel user's hall booking
// @route   PATCH /api/halls/:hallId/bookings/:bookingId/cancel
// @access  Private (User)
export const cancelMyHallBooking = async (req, res, next) => {
  try {
    const hall = await FunctionHall.findById(req.params.hallId);
    if (!hall) return res.status(404).json({ success: false, message: "Hall not found" });

    const booking = hall.bookings.id(req.params.bookingId);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

    if (booking.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    if (booking.status === "Cancelled") {
      return res.status(400).json({ success: false, message: "Booking is already cancelled" });
    }

    booking.status = "Cancelled";
    if (req.body.reason) {
      booking.notes = "User cancelled: " + req.body.reason + (booking.notes ? " | Previous notes: " + booking.notes : "");
    }
    await hall.save();

    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    next(error);
  }
};

