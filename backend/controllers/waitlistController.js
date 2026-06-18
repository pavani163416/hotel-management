import mongoose from "mongoose";
import Waitlist from "../models/Waitlist.js";
import AuditLog from "../models/AuditLog.js";
import Hotel from "../models/Hotel.js";
import Room from "../models/Room.js";
import { sendNotification } from "../utils/notificationService.js";
import logger from "../utils/logger.js";

// @desc    Join the waitlist for a specific hotel/room
// @route   POST /api/waitlist/join
// @access  User
export const joinWaitlist = async (req, res, next) => {
  try {
    const { hotelId, roomId, roomTypeId, startDate, endDate } = req.body;
    const userId = req.user.id;

    if (!hotelId || !startDate || !endDate) {
      return res.status(400).json({ success: false, message: "hotelId, startDate, and endDate are required." });
    }

    let actualHotel = null;
    if (mongoose.Types.ObjectId.isValid(hotelId)) {
      actualHotel = await Hotel.findById(hotelId);
    }
    if (!actualHotel) {
      actualHotel = await Hotel.findOne({ hotelId: hotelId });
    }

    if (!actualHotel) {
      return res.status(404).json({ success: false, message: "Hotel not found." });
    }

    const resolvedHotelId = actualHotel._id;

    // Check if already in waitlist
    const existing = await Waitlist.findOne({
      userId,
      hotelId: resolvedHotelId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status: { $in: ["Pending", "Notified"] }
    });

    if (existing) {
      return res.status(400).json({ success: false, message: "You are already on the waitlist for these dates." });
    }

    // Determine position
    const currentCount = await Waitlist.countDocuments({
      hotelId: resolvedHotelId,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      status: "Pending"
    });

    const waitlist = await Waitlist.create({
      userId,
      hotelId: resolvedHotelId,
      roomId: roomId || null,
      roomTypeId: roomTypeId || null,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      position: currentCount + 1,
      status: "Pending"
    });

    await AuditLog.create({
      action: "WAITLIST_JOIN",
      targetType: "Waitlist",
      targetId: waitlist._id,
      userId,
      role: "customer",
      details: { hotelId: resolvedHotelId, position: waitlist.position }
    });

    // Notify user
    await sendNotification({
      userId,
      role: "customer",
      message: `You have successfully joined the waitlist for your selected dates. You are currently #${waitlist.position} in line.`,
      type: "waitlist_joined"
    });

    res.status(201).json({ success: true, data: waitlist });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's waitlist statuses
// @route   GET /api/waitlist/my
// @access  User
export const getMyWaitlists = async (req, res, next) => {
  try {
    const waitlists = await Waitlist.find({ userId: req.user.id })
      .populate("hotelId", "name location images")
      .populate("roomTypeId", "type name")
      .sort("-createdAt");

    res.status(200).json({ success: true, data: waitlists });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel waitlist entry
// @route   DELETE /api/waitlist/cancel/:id
// @access  User (Own) or Admin
export const cancelWaitlist = async (req, res, next) => {
  try {
    const waitlist = await Waitlist.findById(req.params.id);
    if (!waitlist) return res.status(404).json({ success: false, message: "Waitlist not found" });

    if (waitlist.userId.toString() !== req.user.id && req.user.role !== "admin" && req.user.role !== "super admin") {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    waitlist.status = "Cancelled";
    await waitlist.save();

    await AuditLog.create({
      action: "WAITLIST_CANCELLED",
      targetType: "Waitlist",
      targetId: waitlist._id,
      userId: req.user.id,
      role: req.user.role,
      details: { hotelId: waitlist.hotelId }
    });

    res.status(200).json({ success: true, message: "Waitlist entry cancelled." });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin: Get waitlists by hotel
// @route   GET /api/waitlist/hotel/:hotelId
// @access  Owner or Admin
export const getHotelWaitlists = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const query = { hotelId: req.params.hotelId };
    if (req.query.status) query.status = req.query.status;
    if (req.query.startDate) query.startDate = { $gte: new Date(req.query.startDate) };

    const waitlists = await Waitlist.find(query)
      .populate("userId", "name email phone")
      .sort("position")
      .skip(skip)
      .limit(limit);

    const total = await Waitlist.countDocuments(query);

    res.status(200).json({
      success: true,
      data: waitlists,
      pagination: { total, page, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin: Get all waitlists
// @route   GET /api/waitlist/admin
// @access  Admin, Super Admin
export const getAllWaitlists = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    let query = {};
    if (req.query.hotelId) query.hotelId = req.query.hotelId;
    if (req.query.status) query.status = req.query.status;

    const waitlists = await Waitlist.find(query)
      .populate("hotelId", "name")
      .populate("userId", "name email")
      .sort("-createdAt")
      .skip(skip)
      .limit(limit);
      
    const total = await Waitlist.countDocuments(query);

    res.status(200).json({
      success: true,
      data: waitlists,
      pagination: { total, page, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    next(error);
  }
};

// ── Internal Service for automated trigger ──
export const processWaitlistForHotelAndDates = async (hotelId, startDate, endDate) => {
  try {
    const nextWaitlist = await Waitlist.findOne({
      hotelId,
      startDate: { $lte: new Date(startDate) },
      endDate: { $gte: new Date(endDate) },
      status: "Pending"
    }).sort("position");

    if (!nextWaitlist) return null;

    nextWaitlist.status = "Notified";
    nextWaitlist.notifiedAt = new Date();
    nextWaitlist.bookingWindowExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await nextWaitlist.save();

    await AuditLog.create({
      action: "WAITLIST_NOTIFIED",
      targetType: "Waitlist",
      targetId: nextWaitlist._id,
      userId: nextWaitlist.userId,
      role: "system",
      details: { autoTriggered: true }
    });

    await sendNotification({
      userId: nextWaitlist.userId,
      role: "customer",
      message: "Good news! A room has become available for your requested dates. You have 24 hours to complete your booking.",
      type: "waitlist_available"
    });

    return nextWaitlist;
  } catch (error) {
    logger.error("Error processing waitlist", { error: error.message });
    return null;
  }
};

// @desc    Admin: Manually notify next in line
// @route   POST /api/waitlist/notify/:hotelId
// @access  Owner, Admin
export const notifyNextWaitlist = async (req, res, next) => {
  try {
    const { hotelId } = req.params;
    const { startDate, endDate } = req.body;

    const nextWaitlist = await processWaitlistForHotelAndDates(hotelId, startDate, endDate);

    if (!nextWaitlist) {
      return res.status(404).json({ success: false, message: "No pending waitlist found for these dates." });
    }

    res.status(200).json({ success: true, message: "User notified.", data: nextWaitlist });
  } catch (error) {
    next(error);
  }
};
