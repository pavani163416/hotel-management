import TripPlan from "../models/TripPlan.js";
import Booking from "../models/Booking.js";
import dayjs from "dayjs";

// @desc    Get trip plan for a booking
// @route   GET /api/trip-plans/:bookingId
// @access  User (Owner of booking)
export const getTripPlan = async (req, res, next) => {
  try {
    const { bookingId } = req.params;

    // Check if user owns the booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }
    
    if (booking.userId.toString() !== req.user.id && req.user.role !== "admin" && req.user.role !== "super admin") {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    let tripPlan = await TripPlan.findOne({ bookingId });

    if (!tripPlan) {
      // Auto-generate empty trip plan structure based on checkIn and checkOut dates
      const days = [];
      let currentDate = dayjs(booking.checkIn);
      const endDate = dayjs(booking.checkOut);

      while (currentDate.isBefore(endDate) || currentDate.isSame(endDate, 'day')) {
        days.push({
          date: currentDate.toDate(),
          activities: []
        });
        currentDate = currentDate.add(1, "day");
      }

      tripPlan = await TripPlan.create({
        userId: req.user.id,
        bookingId,
        hotelId: booking.hotelId,
        title: `Trip to ${booking.hotelName || 'our property'}`,
        days,
      });
    }

    res.status(200).json({ success: true, data: tripPlan });
  } catch (error) {
    next(error);
  }
};

// @desc    Add or Update an activity in a specific day
// @route   POST /api/trip-plans/:id/activity
// @access  User (Owner)
export const updateActivity = async (req, res, next) => {
  try {
    const tripPlan = await TripPlan.findById(req.params.id);
    if (!tripPlan) {
      return res.status(404).json({ success: false, message: "Trip plan not found" });
    }
    if (tripPlan.userId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const { date, activityId, time, type, title, description, location, cost, isCompleted } = req.body;
    
    // Find the correct day
    const dayIndex = tripPlan.days.findIndex(d => dayjs(d.date).isSame(dayjs(date), 'day'));
    if (dayIndex === -1) {
      return res.status(400).json({ success: false, message: "Date is outside of the booking duration." });
    }

    if (activityId) {
      // Update existing activity
      const activityIndex = tripPlan.days[dayIndex].activities.findIndex(a => a._id.toString() === activityId);
      if (activityIndex === -1) {
        return res.status(404).json({ success: false, message: "Activity not found" });
      }
      
      const act = tripPlan.days[dayIndex].activities[activityIndex];
      if (time !== undefined) act.time = time;
      if (type !== undefined) act.type = type;
      if (title !== undefined) act.title = title;
      if (description !== undefined) act.description = description;
      if (location !== undefined) act.location = location;
      if (cost !== undefined) act.cost = cost;
      if (isCompleted !== undefined) act.isCompleted = isCompleted;

    } else {
      // Add new activity
      tripPlan.days[dayIndex].activities.push({
        time, type, title, description, location, cost, isCompleted: false
      });
      // Sort activities by time
      tripPlan.days[dayIndex].activities.sort((a, b) => {
        // Simple string comparison works well for "HH:MM AM/PM" if formatted cleanly, 
        // but let's parse time
        const timeA = dayjs(`2000-01-01 ${a.time}`).valueOf();
        const timeB = dayjs(`2000-01-01 ${b.time}`).valueOf();
        return timeA - timeB;
      });
    }

    await tripPlan.save();
    res.status(200).json({ success: true, data: tripPlan });

  } catch (error) {
    next(error);
  }
};

// @desc    Delete an activity
// @route   DELETE /api/trip-plans/:id/activity
// @access  User
export const deleteActivity = async (req, res, next) => {
  try {
    const tripPlan = await TripPlan.findById(req.params.id);
    if (!tripPlan) {
      return res.status(404).json({ success: false, message: "Trip plan not found" });
    }
    if (tripPlan.userId.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    const { date, activityId } = req.body;
    const dayIndex = tripPlan.days.findIndex(d => dayjs(d.date).isSame(dayjs(date), 'day'));
    
    if (dayIndex !== -1) {
      tripPlan.days[dayIndex].activities = tripPlan.days[dayIndex].activities.filter(a => a._id.toString() !== activityId);
      await tripPlan.save();
    }

    res.status(200).json({ success: true, data: tripPlan });
  } catch (error) {
    next(error);
  }
};
