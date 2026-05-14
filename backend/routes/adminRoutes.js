import express  from "express";
import bcrypt   from "bcryptjs";
import { adminLogin, getAdminStats, getAdminAnalytics } from "../controllers/adminController.js";
import { verifyAdminToken, requireAdmin } from "../middleware/adminAuth.js";
import { authLimiter } from "../middleware/rateLimiter.js";
import AdminUser          from "../models/AdminUser.js";
import Manager            from "../models/Manager.js";
import Hotel              from "../models/Hotel.js";
import Room               from "../models/Room.js";
import PriceRequest       from "../models/PriceRequest.js";
import CancellationRefund from "../models/CancellationRefund.js";
import Coupon             from "../models/Coupon.js";
import { sendNotification } from "../utils/notificationService.js";
import logger from "../utils/logger.js";

const router = express.Router();

// ── Public ────────────────────────────────────────────────
router.post("/login", authLimiter, adminLogin);

// ── Protected — all routes below require valid admin JWT ──
const protect = [verifyAdminToken, requireAdmin];

router.get("/stats",     protect, getAdminStats);
router.get("/analytics", protect, getAdminAnalytics);

// ── Admin users ───────────────────────────────────────────
router.get("/users", protect, async (req, res, next) => {
  try {
    const users = await AdminUser.find({}, "-password").sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, data: users });
  } catch (e) { next(e); }
});

router.post("/users", protect, async (req, res, next) => {
  try {
    const { password, ...rest } = req.body;
    const hashed = await bcrypt.hash(password, 12);
    const user   = await AdminUser.create({ ...rest, password: hashed });
    res.status(201).json({ success: true, data: { ...user.toJSON(), password: undefined } });
  } catch (e) { next(e); }
});

router.patch("/users/:id", protect, async (req, res, next) => {
  try {
    const update = { ...req.body };
    if (update.password) update.password = await bcrypt.hash(update.password, 12);
    const user = await AdminUser.findByIdAndUpdate(req.params.id, update, { new: true }).select("-password");
    res.json({ success: true, data: user });
  } catch (e) { next(e); }
});

// ── Manager management ────────────────────────────────────
router.get("/managers", protect, async (req, res, next) => {
  try {
    const managers = await Manager.find({})
      .select("-password")
      .populate("hotelObjectId", "name hotelId")
      .sort({ createdAt: -1 });

    const data = managers.map((m) => ({
      _id:       m._id,
      name:      m.name,
      email:     m.email,
      role:      m.role,
      isActive:  m.isActive,
      lastLogin: m.lastLogin,
      createdAt: m.createdAt,
      hotelId:   m.assignedHotelId   || m.hotelObjectId?.hotelId || null,
      hotelName: m.assignedHotelName || m.hotelObjectId?.name    || null,
    }));

    res.json({ success: true, count: data.length, data });
  } catch (e) { next(e); }
});

router.post("/managers", protect, async (req, res, next) => {
  try {
    const { name, email, password, hotelId, hotelName, isActive } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: "Name, email, and password are required." });
    }

    const existing = await Manager.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: "Email already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    let hotelObjectId = null;
    if (hotelId) {
      const hotel = await Hotel.findOne({ hotelId });
      if (hotel) hotelObjectId = hotel._id;
    }

    const manager = await Manager.create({
      name,
      email:             email.toLowerCase(),
      password:          hashedPassword,
      role:              "Manager",
      assignedHotelId:   hotelId   || null,
      assignedHotelName: hotelName || null,
      hotelObjectId,
      isActive:          isActive !== false,
    });

    sendNotification({
      userId:  manager._id.toString(),
      hotelId: manager.assignedHotelId || null,
      role:    "manager",
      message: "Your manager account has been created",
      type:    "manager",
    }).catch(() => {});

    logger.info("Manager created", { managerId: manager._id, email: manager.email, hotelId });

    res.status(201).json({
      success: true,
      data: { ...manager.toJSON(), password: undefined, hotelName: hotelName || null },
    });
  } catch (e) { next(e); }
});

router.get("/managers/:id", protect, async (req, res, next) => {
  try {
    const manager = await Manager.findById(req.params.id)
      .select("-password")
      .populate("hotelObjectId", "name hotelId");

    if (!manager) return res.status(404).json({ success: false, message: "Manager not found." });

    res.json({
      success: true,
      data: {
        _id:       manager._id,
        name:      manager.name,
        email:     manager.email,
        role:      manager.role,
        isActive:  manager.isActive,
        lastLogin: manager.lastLogin,
        createdAt: manager.createdAt,
        hotelId:   manager.assignedHotelId   || manager.hotelObjectId?.hotelId || null,
        hotelName: manager.assignedHotelName || manager.hotelObjectId?.name    || null,
      },
    });
  } catch (e) { next(e); }
});

router.put("/managers/:id", protect, async (req, res, next) => {
  try {
    const { name, email, password, hotelId, hotelName, isActive } = req.body;

    const manager = await Manager.findById(req.params.id);
    if (!manager) return res.status(404).json({ success: false, message: "Manager not found." });

    if (email && email.toLowerCase() !== manager.email) {
      const existing = await Manager.findOne({ email: email.toLowerCase() });
      if (existing) return res.status(409).json({ success: false, message: "Email already exists." });
      manager.email = email.toLowerCase();
    }

    if (name)     manager.name     = name;
    if (password) manager.password = await bcrypt.hash(password, 12);
    if (isActive !== undefined) manager.isActive = isActive;

    if (hotelId !== undefined) {
      manager.assignedHotelId = hotelId;
      if (hotelId) {
        const hotel = await Hotel.findOne({ hotelId });
        if (hotel) {
          manager.hotelObjectId     = hotel._id;
          manager.assignedHotelName = hotelName || hotel.name;
        }
      } else {
        manager.hotelObjectId     = null;
        manager.assignedHotelName = null;
      }
    }
    if (hotelName !== undefined) manager.assignedHotelName = hotelName;

    await manager.save();
    res.json({ success: true, data: { ...manager.toJSON(), password: undefined } });
  } catch (e) { next(e); }
});

router.delete("/managers/:id", protect, async (req, res, next) => {
  try {
    const manager = await Manager.findByIdAndDelete(req.params.id);
    if (!manager) return res.status(404).json({ success: false, message: "Manager not found." });
    logger.info("Manager deleted", { managerId: req.params.id });
    res.json({ success: true, message: "Manager deleted successfully." });
  } catch (e) { next(e); }
});

// ── Price requests ────────────────────────────────────────
router.get("/price-requests", protect, async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.status)        filter.status        = req.query.status;
    if (req.query.hotelStringId) filter.hotelStringId = req.query.hotelStringId;
    const requests = await PriceRequest.find(filter)
      .populate("roomId",    "roomNumber type pricePerNight")
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });
    res.json({ success: true, count: requests.length, data: requests });
  } catch (e) { next(e); }
});

router.put("/price-requests/:id/approve", protect, async (req, res, next) => {
  try {
    const request = await PriceRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: "Price request not found." });
    if (request.status !== "pending") return res.status(400).json({ success: false, message: "Already reviewed." });

    request.status     = "approved";
    request.reviewedAt = new Date();
    await request.save();
    await Room.findByIdAndUpdate(request.roomId, { pricePerNight: request.requestedPrice });

    sendNotification({
      userId:  request.createdBy?.toString(),
      hotelId: request.hotelStringId,
      role:    "manager",
      message: "Your price request was approved",
      type:    "price",
    }).catch(() => {});

    res.json({ success: true, data: request });
  } catch (e) { next(e); }
});

router.put("/price-requests/:id/reject", protect, async (req, res, next) => {
  try {
    const request = await PriceRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: "Price request not found." });
    if (request.status !== "pending") return res.status(400).json({ success: false, message: "Already reviewed." });

    request.status     = "rejected";
    request.reviewedAt = new Date();
    await request.save();

    sendNotification({
      userId:  request.createdBy?.toString(),
      hotelId: request.hotelStringId,
      role:    "manager",
      message: "Your price request was rejected",
      type:    "price",
    }).catch(() => {});

    res.json({ success: true, data: request });
  } catch (e) { next(e); }
});

// ── Manager insights ──────────────────────────────────────
router.get("/manager-insights", protect, async (req, res, next) => {
  try {
    const allManagers    = await Manager.find({}).populate("hotelObjectId", "name hotelId");
    const totalManagers  = allManagers.length;
    const activeManagers = allManagers.filter((m) => m.isActive).length;

    const managersPerHotel = {};
    allManagers.forEach((m) => {
      const hotelId   = m.assignedHotelId || m.hotelObjectId?.hotelId || "unassigned";
      const hotelName = m.assignedHotelName || m.hotelObjectId?.name  || "Unassigned";
      if (!managersPerHotel[hotelId]) managersPerHotel[hotelId] = { hotelId, hotelName, count: 0 };
      managersPerHotel[hotelId].count++;
    });

    res.json({
      success: true,
      data: {
        totalManagers,
        activeManagers,
        inactiveManagers:  totalManagers - activeManagers,
        managersPerHotel:  Object.values(managersPerHotel),
      },
    });
  } catch (e) { next(e); }
});

// ── Coupons & Offers ──────────────────────────────────────
// GET    /api/admin/coupons          — list all
// POST   /api/admin/coupons          — create
// GET    /api/admin/coupons/:id      — single
// PUT    /api/admin/coupons/:id      — update
// DELETE /api/admin/coupons/:id      — delete

router.get("/coupons", protect, async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === "true";
    const coupons = await Coupon.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, count: coupons.length, data: coupons });
  } catch (e) { next(e); }
});

router.post("/coupons", protect, async (req, res, next) => {
  try {
    const coupon = await Coupon.create({ ...req.body, createdBy: req.admin?.email || "admin" });
    logger.info("Coupon created", { code: coupon.code });
    res.status(201).json({ success: true, data: coupon });
  } catch (e) { next(e); }
});

router.get("/coupons/:id", protect, async (req, res, next) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ success: false, message: "Coupon not found." });
    res.json({ success: true, data: coupon });
  } catch (e) { next(e); }
});

router.put("/coupons/:id", protect, async (req, res, next) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!coupon) return res.status(404).json({ success: false, message: "Coupon not found." });
    res.json({ success: true, data: coupon });
  } catch (e) { next(e); }
});

router.delete("/coupons/:id", protect, async (req, res, next) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) return res.status(404).json({ success: false, message: "Coupon not found." });
    logger.info("Coupon deleted", { code: coupon.code });
    res.json({ success: true, message: "Coupon deleted." });
  } catch (e) { next(e); }
});

// GET /api/admin/coupons/public — managers can see active coupons (no admin auth needed)
router.get("/coupons-public", async (req, res, next) => {
  try {
    const now = new Date();
    const coupons = await Coupon.find({
      isActive: true,
      $or: [{ validUntil: null }, { validUntil: { $gte: now } }],
    }).select("-createdBy").sort({ createdAt: -1 });
    res.json({ success: true, count: coupons.length, data: coupons });
  } catch (e) { next(e); }
});
// GET  /api/admin/cancellations          — list all
// GET  /api/admin/cancellations/:id      — single record
// PATCH /api/admin/cancellations/:id     — update refund status

router.get("/cancellations", protect, async (req, res, next) => {
  try {
    const { refundStatus, guestEmail, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (refundStatus) filter.refundStatus = refundStatus;
    if (guestEmail)   filter.guestEmail   = guestEmail.toLowerCase();

    const skip = (Number(page) - 1) * Number(limit);
    const [records, total] = await Promise.all([
      CancellationRefund.find(filter)
        .populate("bookingId", "status hotelName totalAmount paymentMethod")
        .sort({ cancelledAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      CancellationRefund.countDocuments(filter),
    ]);

    res.json({ success: true, count: records.length, total, page: Number(page), data: records });
  } catch (e) { next(e); }
});

router.get("/cancellations/:id", protect, async (req, res, next) => {
  try {
    const record = await CancellationRefund.findById(req.params.id)
      .populate("bookingId");
    if (!record) return res.status(404).json({ success: false, message: "Record not found." });
    res.json({ success: true, data: record });
  } catch (e) { next(e); }
});

router.patch("/cancellations/:id", protect, async (req, res, next) => {
  try {
    const { refundStatus, refundReference, notes } = req.body;
    const update = {};
    if (refundStatus)    update.refundStatus    = refundStatus;
    if (refundReference) update.refundReference = refundReference;
    if (notes)           update.notes           = notes;
    if (refundStatus === "completed") update.refundProcessedAt = new Date();

    const record = await CancellationRefund.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!record) return res.status(404).json({ success: false, message: "Record not found." });
    res.json({ success: true, data: record });
  } catch (e) { next(e); }
});

export default router;
