import Maintenance from "../models/Maintenance.js";
import AuditLog from "../models/AuditLog.js";

// GET /api/maintenance
export const getMaintenanceRequests = async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.hotelId) filter.hotelId = req.query.hotelId;
    if (req.query.status) filter.status = req.query.status;

    const requests = await Maintenance.find(filter)
      .populate("hotelId", "name hotelId")
      .populate("roomId", "roomNumber type")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: requests.length, data: requests });
  } catch (error) {
    next(error);
  }
};

// POST /api/maintenance
export const createMaintenanceRequest = async (req, res, next) => {
  try {
    const request = await Maintenance.create({
      ...req.body,
      reportedBy: req.user?.email || req.admin?.email || "System",
    });

    // Log the manager/admin action
    await AuditLog.create({
      action: "MAINTENANCE_CREATED",
      targetType: "Maintenance",
      event: "AdminAction",
      userId: req.user?._id || req.admin?._id,
      userEmail: req.user?.email || req.admin?.email,
      role: req.user?.role || "Manager",
      description: `Created maintenance request for ${req.body.issueType}`,
      severity: req.body.priority === "Critical" ? "High" : "Low",
    });

    res.status(201).json({ success: true, data: request });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/maintenance/:id
export const updateMaintenanceRequest = async (req, res, next) => {
  try {
    const request = await Maintenance.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!request) {
      return res.status(404).json({ success: false, message: "Maintenance request not found" });
    }

    await AuditLog.create({
      action: "MAINTENANCE_UPDATED",
      targetType: "Maintenance",
      event: "AdminAction",
      userId: req.user?._id || req.admin?._id,
      userEmail: req.user?.email || req.admin?.email,
      role: req.user?.role || "Manager",
      description: `Updated maintenance request ${request._id} to ${request.status}`,
      severity: "Low",
    });

    res.status(200).json({ success: true, data: request });
  } catch (error) {
    next(error);
  }
};
