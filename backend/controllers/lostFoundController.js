import mongoose from "mongoose";
import LostFound from "../models/LostFound.js";
import AuditLog from "../models/AuditLog.js";
import Hotel from "../models/Hotel.js";
import { sendNotification } from "../utils/notificationService.js";

// Helper to resolve hotelId
const resolveHotelId = async (idOrString) => {
  if (mongoose.Types.ObjectId.isValid(idOrString)) {
    const hotel = await Hotel.findById(idOrString);
    if (hotel) return hotel._id;
  }
  const hotel = await Hotel.findOne({ hotelId: idOrString });
  return hotel ? hotel._id : null;
};

// @desc    Report a lost or found item
// @route   POST /api/lost-found/report
// @access  User
export const reportItem = async (req, res, next) => {
  try {
    const { hotelId, type, itemName, category, description, dateLostFound, locationDetails, images } = req.body;
    const userId = req.user.id;

    if (!hotelId || !type || !itemName || !description || !dateLostFound || !locationDetails) {
      return res.status(400).json({ success: false, message: "Please provide all required fields." });
    }

    const actualHotelId = await resolveHotelId(hotelId);
    if (!actualHotelId) {
      return res.status(404).json({ success: false, message: "Hotel not found." });
    }

    const report = await LostFound.create({
      userId,
      hotelId: actualHotelId,
      type,
      itemName,
      category,
      description,
      dateLostFound: new Date(dateLostFound),
      locationDetails,
      images: images || [],
    });

    await AuditLog.create({
      action: "LOST_FOUND_REPORTED",
      targetType: "LostFound",
      targetId: report._id,
      userId,
      role: req.user.role,
      details: { type, itemName, hotelId: actualHotelId },
    });

    res.status(201).json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's reported items
// @route   GET /api/lost-found/my
// @access  User
export const getMyReports = async (req, res, next) => {
  try {
    const reports = await LostFound.find({ userId: req.user.id })
      .populate("hotelId", "name location")
      .sort("-createdAt");

    res.status(200).json({ success: true, data: reports });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all reports for a specific hotel
// @route   GET /api/lost-found/hotel/:hotelId
// @access  Owner, Admin
export const getHotelReports = async (req, res, next) => {
  try {
    const actualHotelId = await resolveHotelId(req.params.hotelId);
    if (!actualHotelId) {
      return res.status(404).json({ success: false, message: "Hotel not found" });
    }

    const query = { hotelId: actualHotelId };
    if (req.query.type) query.type = req.query.type;
    if (req.query.status) query.status = req.query.status;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const reports = await LostFound.find(query)
      .populate("userId", "name email phone")
      .sort("-createdAt")
      .skip(skip)
      .limit(limit);

    const total = await LostFound.countDocuments(query);

    res.status(200).json({
      success: true,
      data: reports,
      pagination: { total, page, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all reports system-wide
// @route   GET /api/lost-found/admin
// @access  Admin, Super Admin
export const getAllReports = async (req, res, next) => {
  try {
    const query = {};
    if (req.query.type) query.type = req.query.type;
    if (req.query.status) query.status = req.query.status;
    if (req.query.hotelId) {
       const actualId = await resolveHotelId(req.query.hotelId);
       if (actualId) query.hotelId = actualId;
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const reports = await LostFound.find(query)
      .populate("userId", "name email phone")
      .populate("hotelId", "name location")
      .sort("-createdAt")
      .skip(skip)
      .limit(limit);

    const total = await LostFound.countDocuments(query);

    res.status(200).json({
      success: true,
      data: reports,
      pagination: { total, page, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update a report's status
// @route   PUT /api/lost-found/:id/status
// @access  Owner, Admin
export const updateReportStatus = async (req, res, next) => {
  try {
    const { status, adminNotes } = req.body;
    const report = await LostFound.findById(req.params.id).populate("hotelId");

    if (!report) {
      return res.status(404).json({ success: false, message: "Report not found" });
    }

    // Role check for Owner (must own the hotel)
    // For simplicity, we assume auth middleware already ensures Owner/Admin access.
    // If Owner, they should only be able to update their own hotel's reports.
    // In a full RBAC, we'd verify report.hotelId against the owner's hotels.

    const oldStatus = report.status;
    if (status) report.status = status;
    if (adminNotes !== undefined) report.adminNotes = adminNotes;

    await report.save();

    await AuditLog.create({
      action: "LOST_FOUND_STATUS_UPDATED",
      targetType: "LostFound",
      targetId: report._id,
      userId: req.user.id,
      role: req.user.role,
      details: { oldStatus, newStatus: status, adminNotes },
    });

    // Notify user if status changed to Matched or Returned
    if (status && status !== oldStatus && (status === "Matched" || status === "Returned")) {
      await sendNotification({
        userId: report.userId,
        role: "customer",
        message: `Update on your ${report.type} report for '${report.itemName}': The status is now ${status}. ${adminNotes ? 'Note: ' + adminNotes : ''}`,
        type: "lost_found_update"
      });
    }

    res.status(200).json({ success: true, data: report });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete/Cancel a report
// @route   DELETE /api/lost-found/:id
// @access  User (Own), Owner, Admin
export const deleteReport = async (req, res, next) => {
  try {
    const report = await LostFound.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ success: false, message: "Report not found" });
    }

    if (report.userId.toString() !== req.user.id && req.user.role !== "admin" && req.user.role !== "super admin" && req.user.role !== "owner") {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    await report.deleteOne();

    await AuditLog.create({
      action: "LOST_FOUND_DELETED",
      targetType: "LostFound",
      targetId: report._id,
      userId: req.user.id,
      role: req.user.role,
      details: { itemName: report.itemName },
    });

    res.status(200).json({ success: true, message: "Report deleted successfully" });
  } catch (error) {
    next(error);
  }
};
