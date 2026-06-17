/**
 * @swagger
 * tags:
 *   - name: Admin
 *     description: Super-admin endpoints for user, manager, coupon and booking administration
 * /api/admin/login:
 *   post:
 *     summary: Authenticate an admin user
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Admin login successful
 * /api/admin/stats:
 *   get:
 *     summary: Get administrative statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin statistics returned
 * /api/admin/analytics:
 *   get:
 *     summary: Get analytics data for the admin panel
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Analytics data returned
 * /api/admin/users:
 *   get:
 *     summary: List admin user accounts
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin users returned
 *   post:
 *     summary: Create a new admin user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       201:
 *         description: Admin user created
 * /api/admin/users/{id}:
 *   patch:
 *     summary: Update an admin user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Admin user updated
 * /api/admin/managers:
 *   get:
 *     summary: List all managers
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Managers returned
 *   post:
 *     summary: Create a new manager account
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Manager'
 *     responses:
 *       201:
 *         description: Manager created
 * /api/admin/managers/{id}:
 *   get:
 *     summary: Get a manager by ID
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Manager returned
 *   put:
 *     summary: Update a manager account
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Manager updated
 *   delete:
 *     summary: Delete a manager account
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Manager deleted
 * /api/admin/price-requests:
 *   get:
 *     summary: List price requests
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Price requests returned
 * /api/admin/price-requests/{id}/approve:
 *   put:
 *     summary: Approve a price request
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Price request approved
 * /api/admin/price-requests/{id}/reject:
 *   put:
 *     summary: Reject a price request
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Price request rejected
 * /api/admin/coupons:
 *   get:
 *     summary: List coupons
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Coupons returned
 *   post:
 *     summary: Create a coupon
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Coupon'
 *     responses:
 *       201:
 *         description: Coupon created
 * /api/admin/coupons/{id}:
 *   get:
 *     summary: Get coupon details by ID
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Coupon returned
 *   put:
 *     summary: Update a coupon by ID
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Coupon'
 *     responses:
 *       200:
 *         description: Coupon updated
 *   delete:
 *     summary: Delete a coupon by ID
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Coupon deleted
 * /api/admin/coupons-public:
 *   get:
 *     summary: Get public coupons without authentication
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: Public coupons returned
 * /api/admin/cancellations:
 *   get:
 *     summary: List cancellations and refunds
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cancellation list returned
 * /api/admin/cancellations/{id}:
 *   get:
 *     summary: Get cancellation details
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cancellation details returned
 *   patch:
 *     summary: Update a cancellation record
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cancellation status updated
 */
import express  from "express";
import bcrypt   from "bcryptjs";
import mongoose from "mongoose";
import { adminLogin, getAdminStats, getAdminAnalytics } from "../controllers/adminController.js";
import { verifyAdminToken, requireAdmin } from "../middleware/adminAuth.js";
import { authLimiter } from "../middleware/rateLimiter.js";
import { validateLoginPayload } from "../middleware/authValidator.js";
import { requireObjectId } from "../middleware/auth.js";
import AdminUser          from "../models/AdminUser.js";
import Manager            from "../models/Manager.js";
import Hotel              from "../models/Hotel.js";
import Room               from "../models/Room.js";
import Booking            from "../models/Booking.js";
import Guest              from "../models/Guest.js";
import PriceRequest       from "../models/PriceRequest.js";
import CancellationRefund from "../models/CancellationRefund.js";
import Coupon             from "../models/Coupon.js";
import User               from "../models/User.js";
import OwnerApplication   from "../models/OwnerApplication.js";
import { sendNotification } from "../utils/notificationService.js";
import logger from "../utils/logger.js";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { logAudit } from "../utils/auditLogger.js";

const router = express.Router();

// ── Public ────────────────────────────────────────────────
router.post("/login", authLimiter, validateLoginPayload, adminLogin);

// ── Protected — all routes below require valid admin JWT ──
const protect = [verifyAdminToken, requireAdmin];

// ── PUT /api/admin/change-password ────────────────────────
router.put("/change-password", protect, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Current password and new password are required." });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: "New password must be at least 8 characters long." });
    }
    if (newPassword.length > 72) {
      return res.status(400).json({ success: false, message: "New password must be at most 72 characters long." });
    }
    if (!/[A-Z]/.test(newPassword)) {
      return res.status(400).json({ success: false, message: "New password must contain at least one uppercase letter." });
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
      return res.status(400).json({ success: false, message: "New password must contain at least one special character." });
    }

    const adminEmail = req.admin?.email;
    if (!adminEmail) {
      return res.status(401).json({ success: false, message: "Unable to identify admin user." });
    }

    const normalizedEmail = adminEmail.toLowerCase().trim();
    const currentPwdTrim = currentPassword.trim();

    // ── 1. Try controller DB first (same DB that login uses) ──
    try {
      const { default: connectAdminDB } = await import("../config/adminDb.js");
      const conn = await connectAdminDB();
      if (conn) {
        const AdminUserCtrl = conn.models.AdminUser || conn.model("AdminUser", new (await import("mongoose")).default.Schema({
          name: String,
          email: { type: String, lowercase: true },
          password: String,
          role: String,
          isActive: Boolean,
          lastLogin: Date,
        }, { collection: "adminusers" }));

        const ctrlAdmin = await AdminUserCtrl.findOne({ email: normalizedEmail });
        if (ctrlAdmin) {
          const storedPwd = ctrlAdmin.password;
          const isHashed = typeof storedPwd === "string" && storedPwd.startsWith("$2");
          const isMatch = isHashed
            ? await bcrypt.compare(currentPwdTrim, storedPwd)
            : currentPwdTrim === storedPwd;

          if (!isMatch) {
            logger.info("Password verification failed (controller DB)", { email: normalizedEmail, isHashed });
            return res.status(401).json({ success: false, message: "Current password is incorrect." });
          }

          ctrlAdmin.password = await bcrypt.hash(newPassword, 12);
          await ctrlAdmin.save();
          logger.info("Admin password changed via controller DB", { email: normalizedEmail });
          return res.json({ success: true, message: "Password changed successfully." });
        }
      }
    } catch (dbErr) {
      logger.warn("Controller DB lookup failed for change-password, trying fallbacks", { error: dbErr.message });
    }

    // ── 2. Try athithigriha DB AdminUser model ──
    const adminUser = await AdminUser.findOne({ email: normalizedEmail });
    if (adminUser) {
      const storedPwd = adminUser.password;
      const isHashed = typeof storedPwd === "string" && storedPwd.startsWith("$2");
      const isMatch = isHashed
        ? await bcrypt.compare(currentPwdTrim, storedPwd)
        : currentPwdTrim === storedPwd;

      if (!isMatch) {
        logger.info("Password verification failed (athithigriha DB)", { email: normalizedEmail, isHashed });
        return res.status(401).json({ success: false, message: "Current password is incorrect." });
      }

      adminUser.password = await bcrypt.hash(newPassword, 12);
      await adminUser.save();
      logger.info("Admin password changed via athithigriha DB", { email: normalizedEmail });
      return res.json({ success: true, message: "Password changed successfully." });
    }

    // ── 3. Fallback: env-based admin ──
    const envEmail    = process.env.ADMIN_EMAIL?.trim();
    const envPassword = process.env.ADMIN_PASSWORD?.trim();
    if (envEmail && normalizedEmail === envEmail.toLowerCase().trim()) {
      const envMatch = envPassword?.startsWith("$2")
        ? await bcrypt.compare(currentPwdTrim, envPassword)
        : currentPwdTrim === envPassword;
      if (!envMatch) {
        return res.status(401).json({ success: false, message: "Current password is incorrect." });
      }
      // Update .env with new hashed password
      try {
        const newHash = await bcrypt.hash(newPassword, 12);
        const envPath = path.resolve(process.cwd(), '.env');
        const envContent = await fs.promises.readFile(envPath, "utf8");
        const updatedContent = envContent.replace(/^ADMIN_PASSWORD=.*$/m, `ADMIN_PASSWORD=${newHash}`);
        await fs.promises.writeFile(envPath, updatedContent, "utf8");
        logger.info("Admin password changed via env", { email: normalizedEmail });
        return res.json({ success: true, message: "Password changed successfully." });
      } catch (e) {
        logger.error("Failed to update .env password", e);
        return res.status(500).json({ success: false, message: "Failed to update password configuration." });
      }
    }

    return res.status(404).json({ success: false, message: "Admin account not found." });
  } catch (e) { next(e); }
});

router.get("/stats",     protect, getAdminStats);
router.get("/analytics", protect, getAdminAnalytics);

// ── Guest registration by admin ───────────────────────────
// POST /api/admin/guests  { name, email, phone?, city? }
router.post("/guests", protect, async (req, res, next) => {
  try {
    const { name, email, phone, city, status } = req.body;
    if (!name || !email) {
      return res.status(400).json({ success: false, message: "Name and email are required" });
    }
    const normalizedEmail = email.toLowerCase().trim();
    const existing = await Guest.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(200).json({ success: true, message: "Guest already exists", data: existing });
    }
    const guest = await Guest.create({
      name:  name.trim(),
      email: normalizedEmail,
      phone: phone?.trim() || "N/A",
      city:  city?.trim()  || "",
    });
    logger.info("Admin registered guest", { email: normalizedEmail });
    res.status(201).json({ success: true, message: "Guest registered successfully", data: guest });
  } catch (e) { next(e); }
});

// ── Admin users ───────────────────────────────────────────
router.get("/users", protect, async (req, res, next) => {
  try {
    const users = await AdminUser.find({}, "-password").sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, data: users });
  } catch (e) { next(e); }
});

router.post("/users", protect, async (req, res, next) => {
  try {
    const { password, name, email, role, isActive, assignedHotelId, assignedHotelName } = req.body;
    if (!name || !email) {
      return res.status(400).json({ success: false, message: "Name and email are required." });
    }
    if (password) {
      if (password.length < 8) return res.status(400).json({ success: false, message: "Password must be at least 8 characters long." });
      if (password.length > 72) return res.status(400).json({ success: false, message: "Password must be at most 72 characters long." });
      if (!/[A-Z]/.test(password)) return res.status(400).json({ success: false, message: "Password must contain at least one uppercase letter." });
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return res.status(400).json({ success: false, message: "Password must contain at least one special character." });
    } else {
      return res.status(400).json({ success: false, message: "Password is required." });
    }

    // ── Hotel referential integrity for Manager-role admin users ──
    const safeData = { name, email: email.toLowerCase().trim(), role: role || "Staff", isActive: isActive !== false };
    if (safeData.role === "Manager") {
      if (!assignedHotelId || typeof assignedHotelId !== "string" || assignedHotelId.trim() === "") {
        return res.status(400).json({ success: false, message: "Manager role requires a valid assignedHotelId." });
      }
      const hotel = await Hotel.findOne({ hotelId: assignedHotelId.trim() });
      if (!hotel) {
        return res.status(404).json({ success: false, message: `Hotel with hotelId '${assignedHotelId}' does not exist.` });
      }
      safeData.assignedHotelId   = hotel.hotelId;
      safeData.assignedHotelName = hotel.name;
      safeData.hotelObjectId     = hotel._id;
    }

    const hashed = await bcrypt.hash(password, 12);
    const user   = await AdminUser.create({ ...safeData, password: hashed });
    res.status(201).json({ success: true, data: { ...user.toJSON(), password: undefined } });
  } catch (e) { next(e); }
});

router.patch("/users/:id", protect, requireObjectId(), async (req, res, next) => {
  try {
    const update = { ...req.body };
    // Whitelist safe updatable fields — prevent mass assignment
    const { name, email, role, isActive, password, assignedHotelId } = update;
    const safeUpdate = {};
    if (name     !== undefined) safeUpdate.name     = name;
    if (email    !== undefined) safeUpdate.email    = email.toLowerCase().trim();
    if (role     !== undefined) safeUpdate.role     = role;
    if (isActive !== undefined) safeUpdate.isActive = isActive;
    if (password) {
      if (password.length < 8) return res.status(400).json({ success: false, message: "Password must be at least 8 characters long." });
      if (password.length > 72) return res.status(400).json({ success: false, message: "Password must be at most 72 characters long." });
      if (!/[A-Z]/.test(password)) return res.status(400).json({ success: false, message: "Password must contain at least one uppercase letter." });
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return res.status(400).json({ success: false, message: "Password must contain at least one special character." });
      safeUpdate.password = await bcrypt.hash(password, 12);
    }

    // ── Hotel referential integrity on admin user update ──
    if (assignedHotelId !== undefined) {
      if (assignedHotelId === null || (typeof assignedHotelId === "string" && assignedHotelId.trim() === "")) {
        return res.status(400).json({ success: false, message: "assignedHotelId cannot be null or empty." });
      }
      if (typeof assignedHotelId !== "string") {
        return res.status(400).json({ success: false, message: "assignedHotelId must be a non-empty string." });
      }
      const hotel = await Hotel.findOne({ hotelId: assignedHotelId.trim() });
      if (!hotel) {
        return res.status(404).json({ success: false, message: `Hotel with hotelId '${assignedHotelId}' does not exist.` });
      }
      safeUpdate.assignedHotelId   = hotel.hotelId;
      safeUpdate.assignedHotelName = hotel.name;
      safeUpdate.hotelObjectId     = hotel._id;
    }

    // If role is being changed to Manager, ensure hotel assignment exists
    const effectiveRole = role || (await AdminUser.findById(req.params.id))?.role;
    if (effectiveRole === "Manager" && assignedHotelId === undefined) {
      const existingUser = await AdminUser.findById(req.params.id);
      if (existingUser && !existingUser.assignedHotelId) {
        return res.status(400).json({ success: false, message: "Manager role requires a valid hotel assignment. Please provide assignedHotelId." });
      }
    }

    const user = await AdminUser.findByIdAndUpdate(req.params.id, safeUpdate, { new: true, runValidators: true }).select("-password");
    if (!user) return res.status(404).json({ success: false, message: "Admin user not found." });
    res.json({ success: true, data: user });
  } catch (e) { next(e); }
});

// ── Manager management ────────────────────────────────────
function generateTemporaryPassword() {
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*";
  
  const passArr = [
    lowercase[crypto.randomInt(lowercase.length)],
    uppercase[crypto.randomInt(uppercase.length)],
    numbers[crypto.randomInt(numbers.length)],
    symbols[crypto.randomInt(symbols.length)],
  ];
  
  const allChars = lowercase + uppercase + numbers + symbols;
  for (let i = 0; i < 8; i++) {
    passArr.push(allChars[crypto.randomInt(allChars.length)]);
  }
  
  for (let i = passArr.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [passArr[i], passArr[j]] = [passArr[j], passArr[i]];
  }
  
  return passArr.join("");
}

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
    const { name, email, hotelId, hotelName, isActive } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: "Name and email are required." });
    }

    // ── Hotel referential integrity validation ──
    if (hotelId === null || (typeof hotelId === "string" && hotelId.trim() === "")) {
      return res.status(400).json({ success: false, message: "A valid hotel assignment is required. hotelId cannot be null or empty." });
    }
    if (!hotelId || typeof hotelId !== "string") {
      return res.status(400).json({ success: false, message: "hotelId is required and must be a non-empty string." });
    }

    const existing = await Manager.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: "Email already exists." });
    }

    const hotel = await Hotel.findOne({ hotelId: hotelId.trim() });
    if (!hotel) {
      return res.status(404).json({ success: false, message: `Hotel with hotelId '${hotelId}' does not exist.` });
    }

    const tempPassword = generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    const manager = await Manager.create({
      name,
      email:             email.toLowerCase(),
      password:          hashedPassword,
      mustChangePassword: true,
      role:              "Manager",
      assignedHotelId:   hotel.hotelId,
      assignedHotelName: hotel.name,
      hotelObjectId:     hotel._id,
      isActive:          isActive !== false,
    });

    sendNotification({
      userId:  manager._id.toString(),
      hotelId: manager.assignedHotelId || null,
      role:    "manager",
      message: "Your manager account has been created",
      type:    "manager",
    }).catch(() => {});

    await logAudit({
      req,
      userId: req.user?.email || "admin",
      role: req.user?.role || "Admin",
      action: "MANAGER_CREATED",
      details: { managerId: manager._id, email: manager.email, hotelId: hotel.hotelId }
    });

    logger.info("Manager created", { managerId: manager._id, email: manager.email, hotelId: hotel.hotelId });

    res.status(201).json({
      success: true,
      manager: {
        email: manager.email,
      },
      data: { ...manager.toJSON(), password: undefined, hotelName: hotel.name },
      temporaryPassword: tempPassword,
    });
  } catch (e) { next(e); }
});

router.get("/managers/:id", protect, requireObjectId(), async (req, res, next) => {
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

router.put("/managers/:id", protect, requireObjectId(), async (req, res, next) => {
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
    if (password) {
      if (password.length < 8) {
        return res.status(400).json({ success: false, message: "Password must be at least 8 characters long." });
      }
      if (password.length > 72) {
        return res.status(400).json({ success: false, message: "Password must be at most 72 characters long." });
      }
      if (!/[A-Z]/.test(password)) {
        return res.status(400).json({ success: false, message: "Password must contain at least one uppercase letter." });
      }
      if (!/[!@#$%^&*(),.?\":{}|<>]/.test(password)) {
        return res.status(400).json({ success: false, message: "Password must contain at least one special character." });
      }
      manager.password = await bcrypt.hash(password, 12);
      manager.mustChangePassword = true;

      await logAudit({
        req,
        userId: req.user?.email || "admin",
        role: req.user?.role || "Admin",
        action: "PASSWORD_CHANGED",
        details: { managerId: manager._id, email: manager.email }
      });
    }
    if (isActive !== undefined) manager.isActive = isActive;

    // ── Hotel referential integrity validation on update ──
    if (hotelId !== undefined) {
      if (hotelId === null || (typeof hotelId === "string" && hotelId.trim() === "")) {
        return res.status(400).json({ success: false, message: "hotelId cannot be null or empty when updating hotel assignment." });
      }
      if (typeof hotelId !== "string") {
        return res.status(400).json({ success: false, message: "hotelId must be a non-empty string." });
      }
      const hotel = await Hotel.findOne({ hotelId: hotelId.trim() });
      if (!hotel) {
        return res.status(404).json({ success: false, message: `Hotel with hotelId '${hotelId}' does not exist.` });
      }
      manager.assignedHotelId   = hotel.hotelId;
      manager.hotelObjectId     = hotel._id;
      manager.assignedHotelName = hotelName || hotel.name;
    }

    await manager.save();
    res.json({ success: true, data: { ...manager.toJSON(), password: undefined } });
  } catch (e) { next(e); }
});

router.post("/managers/:id/reset-password", protect, requireObjectId(), async (req, res, next) => {
  try {
    const manager = await Manager.findById(req.params.id);
    if (!manager) return res.status(404).json({ success: false, message: "Manager not found." });

    const tempPassword = generateTemporaryPassword();
    manager.password = await bcrypt.hash(tempPassword, 12);
    manager.mustChangePassword = true;
    await manager.save();

    await logAudit({
      req,
      userId: req.user?.email || "admin",
      role: req.user?.role || "Admin",
      action: "PASSWORD_RESET",
      details: { managerId: manager._id, email: manager.email }
    });

    res.json({
      success: true,
      message: "Password reset successfully.",
      temporaryPassword: tempPassword
    });
  } catch (e) { next(e); }
});

router.delete("/managers/:id", protect, requireObjectId(), async (req, res, next) => {
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

router.put("/price-requests/:id/approve", protect, requireObjectId(), async (req, res, next) => {
  try {
    const request = await PriceRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: "Price request not found." });
    if (request.status !== "pending") return res.status(400).json({ success: false, message: "Already reviewed." });

    request.status     = "approved";
    request.reviewedAt = new Date();
    await request.save();

    // Update the room price — warn if room no longer exists
    const updatedRoom = await Room.findByIdAndUpdate(
      request.roomId,
      { pricePerNight: request.requestedPrice },
      { new: true }
    );
    if (!updatedRoom) {
      logger.warn("Price request approved but associated room not found", {
        priceRequestId: req.params.id,
        roomId: request.roomId,
        requestedPrice: request.requestedPrice,
      });
    }

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

router.put("/price-requests/:id/reject", protect, requireObjectId(), async (req, res, next) => {
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
    const [allManagers, recentLogs] = await Promise.all([
      Manager.find({}).populate("hotelObjectId", "name hotelId"),
      import("../models/AuditLog.js").then((mod) =>
        mod.default.find({ role: { $in: ["Manager", "Admin"] } })
          .sort({ createdAt: -1 })
          .limit(20)
      )
    ]);
    
    const totalManagers  = allManagers.length;
    const activeManagers = allManagers.filter((m) => m.isActive).length;

    const managersPerHotel = {};
    const recentlyActive = [...allManagers]
      .sort((a, b) => new Date(b.lastLogin || 0) - new Date(a.lastLogin || 0))
      .slice(0, 5)
      .map(m => ({
        _id: m._id,
        name: m.name,
        email: m.email,
        hotelName: m.assignedHotelName || m.hotelObjectId?.name || 'Unassigned',
        isActive: m.isActive,
        lastLogin: m.lastLogin
      }));

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
        recentlyActive,
        recentActivity: recentLogs,
      },
    });
  } catch (e) { next(e); }
});

// ── Hotel Manager Mapping ──────────────────────────────────
router.get("/hotel-manager-map", protect, async (req, res, next) => {
  try {
    const hotels = await Hotel.find({}).sort({ name: 1 });
    const managers = await import("../models/AdminUser.js").then(m => m.default.find({ role: "Manager", isActive: true }));
    
    const hotelMap = hotels.map(h => {
      const hotelManagers = managers.filter(m => 
        m.assignedHotelId === h.hotelId || 
        (m.hotelObjectId && m.hotelObjectId.toString() === h._id.toString())
      ).map(m => ({ _id: m._id, name: m.name, email: m.email }));

      return {
        hotelId: h.hotelId,
        name: h.name,
        location: h.location,
        city: h.city,
        managers: hotelManagers
      };
    });

    res.json({ success: true, data: { hotels: hotelMap } });
  } catch (e) { next(e); }
});

// ── Coupons & Offers ──────────────────────────────────────
// GET    /api/admin/coupons          — list all
// POST   /api/admin/coupons          — create
// GET    /api/admin/coupons/:id      — single
// PUT    /api/admin/coupons/:id      — update
// DELETE /api/admin/coupons/:id      — delete

const validateAndSanitizeCoupon = (body, isUpdate = false, existingCoupon = null) => {
  const { code, description, internalNotes, title, value, type, validUntil, usageLimit, maxUses } = body;

  // 1. XSS checks
  const xssPattern = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>|on\w+\s*=|javascript:/i;
  const genericHtmlPattern = /<[^>]*>/;

  const checkXss = (val, fieldName) => {
    if (typeof val === 'string') {
      if (xssPattern.test(val) || genericHtmlPattern.test(val)) {
        return `${fieldName} contains invalid HTML or script content.`;
      }
    }
    return null;
  };

  let xssErr = null;
  if (code) xssErr = checkXss(code, "code");
  if (!xssErr && description) xssErr = checkXss(description, "description");
  if (!xssErr && internalNotes) xssErr = checkXss(internalNotes, "internalNotes");
  if (!xssErr && title) xssErr = checkXss(title, "title");

  if (xssErr) {
    return { isValid: false, status: 400, message: xssErr };
  }

  // 2. Strict code regex
  if (code !== undefined) {
    body.code = code.toUpperCase();
    const couponCodeRegex = /^[A-Z0-9_-]{1,50}$/i;
    if (!couponCodeRegex.test(body.code)) {
      return { isValid: false, status: 400, message: "Coupon code must contain only alphanumeric characters, dashes, or underscores, and be up to 50 characters long." };
    }
  }

  // 3. Business logic
  const mergedType = type !== undefined ? type : (existingCoupon ? existingCoupon.type : "percentage");
  const mergedValue = value !== undefined ? value : (existingCoupon ? existingCoupon.value : null);

  if (mergedValue !== null && mergedValue !== undefined) {
    if (mergedValue <= 0) {
      return { isValid: false, status: 400, message: "Discount must be greater than 0" };
    }
    if (mergedType === "percentage" && mergedValue > 100) {
      return { isValid: false, status: 400, message: "Percentage discount cannot exceed 100%" };
    }
  } else if (!isUpdate) {
    return { isValid: false, status: 400, message: "Discount value is required" };
  }

  if (validUntil) {
    if (new Date(validUntil) <= new Date()) {
      return { isValid: false, status: 400, message: "Coupon expiry must be in the future" };
    }
  }

  // Map maxUses to usageLimit
  if (maxUses !== undefined && usageLimit === undefined) {
    body.usageLimit = maxUses;
  }

  const limitToCheck = body.usageLimit !== undefined ? body.usageLimit : maxUses;
  if (limitToCheck !== undefined && limitToCheck !== null && limitToCheck !== "") {
    const numLimit = Number(limitToCheck);
    if (numLimit <= 0) {
      return { isValid: false, status: 400, message: "maxUses must be greater than 0" };
    }
  }

  // Sanitize fields
  const sanitize = (val) => {
    if (typeof val !== 'string') return val;
    return val
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;")
      .replace(/\//g, "&#x2F;");
  };

  if (body.description) body.description = sanitize(body.description);
  if (body.internalNotes) body.internalNotes = sanitize(body.internalNotes);
  if (body.title) body.title = sanitize(body.title);

  return { isValid: true };
};

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
    const check = validateAndSanitizeCoupon(req.body, false);
    if (!check.isValid) {
      return res.status(check.status).json({ success: false, message: check.message });
    }
    const coupon = await Coupon.create({ ...req.body, createdBy: req.admin?.email || "admin" });
    logger.info("Coupon created", { code: coupon.code });
    const io = req.app.get("io");
    if (io) {
      io.emit("coupon_update", { action: "create", coupon });
    }
    res.status(201).json({ success: true, data: coupon });
  } catch (e) { next(e); }
});

router.get("/coupons/:id", protect, requireObjectId(), async (req, res, next) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    if (!coupon) return res.status(404).json({ success: false, message: "Coupon not found." });
    res.json({ success: true, data: coupon });
  } catch (e) { next(e); }
});

router.put("/coupons/:id", protect, requireObjectId(), async (req, res, next) => {
  try {
    const existingCoupon = await Coupon.findById(req.params.id);
    if (!existingCoupon) return res.status(404).json({ success: false, message: "Coupon not found." });

    const check = validateAndSanitizeCoupon(req.body, true, existingCoupon);
    if (!check.isValid) {
      return res.status(check.status).json({ success: false, message: check.message });
    }

    const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    const io = req.app.get("io");
    if (io) {
      io.emit("coupon_update", { action: "update", coupon });
    }
    res.json({ success: true, data: coupon });
  } catch (e) { next(e); }
});

router.delete("/coupons/:id", protect, requireObjectId(), async (req, res, next) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) return res.status(404).json({ success: false, message: "Coupon not found." });
    logger.info("Coupon deleted", { code: coupon.code });
    const io = req.app.get("io");
    if (io) {
      io.emit("coupon_update", { action: "delete", id: req.params.id, code: coupon.code });
    }
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
    })
    .select("_id code description type value minBookingAmount maxDiscount applicableHotelIds validFrom validUntil usageLimit firstTimeOnly isActive")
    .sort({ createdAt: -1 });
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

router.get("/cancellations/:id", protect, requireObjectId(), async (req, res, next) => {
  try {
    const record = await CancellationRefund.findById(req.params.id)
      .populate("bookingId");
    if (!record) return res.status(404).json({ success: false, message: "Record not found." });
    res.json({ success: true, data: record });
  } catch (e) { next(e); }
});

router.patch("/cancellations/:id", protect, requireObjectId(), async (req, res, next) => {
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

// ── One-time migration: sync hotel embedded rooms → standalone Room collection ─
// POST /api/admin/migrate/fix-room-hotel-ids
// Fixes two problems:
//   1. Tags existing standalone rooms with correct hotelStringId
//   2. Syncs hotel embedded rooms into the standalone Room collection
router.post("/migrate/fix-room-hotel-ids", protect, async (req, res, next) => {
  try {
    const BED_TYPE_MAP = {
      "1 King Bed": "King", "2 King Beds": "King", "King": "King",
      "1 Queen Bed": "Queen", "Queen": "Queen",
      "2 Twin Beds": "Twin", "Twin": "Twin",
      "1 King Bed + Sofa": "King",
      "Single": "Single", "Double": "Double",
    };

    const hotels = await Hotel.find({}).lean();
    let synced = 0, tagged = 0, skipped = 0;
    const report = [];

    for (const hotel of hotels) {
      // ── Step 1: Sync embedded rooms → standalone Room collection ──
      if (hotel.rooms && hotel.rooms.length > 0) {
        for (const embRoom of hotel.rooms) {
          const roomNumber = embRoom.id;
          if (!roomNumber) continue;

          const existing = await Room.findOne({ roomNumber }).lean();
          if (existing) {
            // Just ensure hotelStringId is set
            if (existing.hotelStringId !== hotel.hotelId) {
              await Room.updateOne({ roomNumber }, { $set: { hotelStringId: hotel.hotelId, hotelId: hotel._id } });
              tagged++;
            } else {
              skipped++;
            }
            continue;
          }

          // Derive type from room name
          const nameLower = (embRoom.name || "").toLowerCase();
          let type = "Standard";
          if (nameLower.includes("suite")) type = "Suite";
          else if (nameLower.includes("deluxe")) type = "Deluxe";
          else if (nameLower.includes("penthouse")) type = "Penthouse";
          else if (nameLower.includes("villa")) type = "Villa";

          const bedRaw = embRoom.bed || "King";
          const bedType = BED_TYPE_MAP[bedRaw] || "King";

          await Room.create({
            roomNumber,
            type,
            description:   embRoom.description || `${embRoom.name} at ${hotel.name}`,
            pricePerNight: embRoom.price || 0,
            capacity:      embRoom.capacity || 2,
            bedType,
            amenities:     embRoom.features || [],
            status:        (embRoom.available ?? 1) > 0 ? "Available" : "Booked",
            isActive:      true,
            hotelStringId: hotel.hotelId,
            hotelId:       hotel._id,
          });
          synced++;
          report.push(`Created: ${roomNumber} → ${hotel.name} (${hotel.hotelId})`);
        }
      }

      // ── Step 2: Tag existing standalone rooms by prefix ──
      const clean = hotel.name.toLowerCase().replace(/[^a-z0-9\s]/g, "");
      const words = clean.split(/\s+/).filter(Boolean);
      let prefix;
      if (words.length >= 2 && words[0].length >= 3) prefix = words[0].slice(0, 3);
      else if (words.length >= 2) prefix = words.map((w) => w[0]).join("").slice(0, 4);
      else prefix = clean.slice(0, 3);

      const prefixRooms = await Room.find({
        roomNumber: new RegExp(`^${prefix}-`, "i"),
        hotelStringId: { $ne: hotel.hotelId },
      }).lean();

      for (const room of prefixRooms) {
        await Room.updateOne({ _id: room._id }, { $set: { hotelStringId: hotel.hotelId, hotelId: hotel._id } });
        tagged++;
        report.push(`Tagged: ${room.roomNumber} → ${hotel.hotelId}`);
      }
    }

    logger.info("Room migration complete", { synced, tagged, skipped });
    res.json({
      success: true,
      message: `Done. Synced from hotel: ${synced}, Tagged by prefix: ${tagged}, Already correct: ${skipped}`,
      data: { synced, tagged, skipped, report },
    });
  } catch (e) { next(e); }
});

// ─────────────────────────────────────────────────────────
// PUT /api/admin/bookings/:id/reassign   { newRoomId }
// Admin-level booking room reassignment — no hotel isolation.
// Validates overlap before reassigning.
// ─────────────────────────────────────────────────────────
router.put("/bookings/:id/reassign", protect, requireObjectId(), async (req, res, next) => {
  try {
    const { newRoomId } = req.body;
    if (!newRoomId) return res.status(400).json({ success: false, message: "newRoomId is required" });

    const booking = await Booking.findById(req.params.id).populate("room");
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    if (["Cancelled", "CheckedOut", "Completed"].includes(booking.status)) {
      return res.status(400).json({ success: false, message: "Cannot reassign a completed or cancelled booking" });
    }

    const newRoom = await Room.findById(newRoomId);
    if (!newRoom) return res.status(404).json({ success: false, message: "Target room not found" });
    if (newRoom.status === "Maintenance" || newRoom.status === "Blocked") {
      return res.status(409).json({ success: false, message: `Room is ${newRoom.status} and cannot be assigned` });
    }

    // Check date overlap on target room (exclude current booking)
    const overlap = await Booking.findOne({
      _id:      { $ne: booking._id },
      room:     newRoom._id,
      status:   { $in: ["Confirmed", "CheckedIn"] },
      checkIn:  { $lt: booking.checkOut },
      checkOut: { $gt: booking.checkIn },
    });
    if (overlap) {
      return res.status(409).json({
        success: false,
        message: `Room ${newRoom.roomNumber} is already booked for overlapping dates`,
      });
    }

    // Free old room if no other active bookings remain on it
    const oldRoomId = booking.room?._id;
    if (oldRoomId && String(oldRoomId) !== String(newRoom._id)) {
      const others = await Booking.countDocuments({
        _id:    { $ne: booking._id },
        room:   oldRoomId,
        status: { $in: ["Confirmed", "CheckedIn"] },
      });
      if (others === 0) {
        await Room.findByIdAndUpdate(oldRoomId, { status: "Available" });
      }
    }

    // Assign new room
    booking.room = newRoom._id;
    await booking.save();
    await Room.findByIdAndUpdate(newRoom._id, { status: "Booked" });

    const io = req.app.get("io");
    if (io) {
      io.emit("roomStatusUpdate", { roomId: newRoom._id, roomNumber: newRoom.roomNumber, status: "Booked" });
      if (oldRoomId && String(oldRoomId) !== String(newRoom._id)) {
        io.emit("roomStatusUpdate", { roomId: oldRoomId, status: "Available" });
      }
    }

    const populated = await Booking.findById(booking._id)
      .populate("room", "roomNumber type floor pricePerNight")
      .populate("guest", "name email phone");

    res.json({ success: true, message: `Booking moved to room ${newRoom.roomNumber}`, data: populated });
  } catch (e) { next(e); }
});

// ── GET /api/admin/hotels/all-unassigned ─────────────────
// Get all hotels that are currently not assigned to any property owner
router.get("/hotels/all-unassigned", protect, async (req, res, next) => {
  try {
    const hotels = await Hotel.find({ 
      $or: [
        { ownerId: null },
        { ownerId: { $exists: false } }
      ]
    }).sort({ name: 1 });
    res.json({ success: true, data: hotels });
  } catch (e) { next(e); }
});

// ── GET /api/admin/property-owners/:ownerId/hotels ────────
router.get("/property-owners/:ownerId/hotels", protect, async (req, res, next) => {
  try {
    const { ownerId } = req.params;
    const hotels = await Hotel.find({ ownerId }).sort({ name: 1 });
    res.json({ success: true, data: hotels });
  } catch (e) { next(e); }
});

// ── POST /api/admin/property-owners/:ownerId/assign-hotel ─
router.post("/property-owners/:ownerId/assign-hotel", protect, async (req, res, next) => {
  try {
    const { ownerId } = req.params;
    const { hotelIds } = req.body; // Can be array of MongoDB _id or hotelId strings

    if (!hotelIds || !Array.isArray(hotelIds) || hotelIds.length === 0) {
      return res.status(400).json({ success: false, message: "Valid hotelIds array is required." });
    }

    const user = await User.findById(ownerId);
    if (!user) {
      return res.status(404).json({ success: false, message: "Property owner account not found." });
    }
    if (user.role !== "owner") {
      return res.status(400).json({ success: false, message: "This user is not an approved property owner. Only approved owners can receive hotels." });
    }

    // Process each hotel
    const assignedHotels = [];
    for (const hId of hotelIds) {
      const hotel = await Hotel.findOne({
        $or: [
          { _id: mongoose.Types.ObjectId.isValid(hId) ? hId : null },
          { hotelId: hId }
        ].filter(cond => cond !== null)
      });

      if (!hotel) {
        return res.status(404).json({ success: false, message: `Hotel with identifier '${hId}' not found.` });
      }

      // Check if already assigned to a different owner
      if (hotel.ownerId && String(hotel.ownerId) !== String(ownerId)) {
        return res.status(400).json({ 
          success: false, 
          message: `Hotel '${hotel.name}' is already assigned to another owner.` 
        });
      }

      hotel.ownerId = ownerId;
      await hotel.save();

      // Maintain user.hotelIds list as well
      if (!user.hotelIds.includes(hotel.hotelId)) {
        user.hotelIds.push(hotel.hotelId);
      }

      assignedHotels.push(hotel);

      // Audit Log
      await logAudit({
        req,
        userId: req.admin?.email || "admin",
        role: req.admin?.role || "Admin",
        action: "HOTEL_ASSIGNED",
        details: { hotelId: hotel.hotelId, hotelName: hotel.name, ownerId, ownerEmail: user.email }
      });
    }

    await user.save();

    res.json({ 
      success: true, 
      message: `Successfully assigned ${assignedHotels.length} hotel(s) to ${user.name}.`,
      data: assignedHotels
    });
  } catch (e) { next(e); }
});

// ── DELETE /api/admin/property-owners/:ownerId/hotels/:hotelId ─
router.delete("/property-owners/:ownerId/hotels/:hotelId", protect, async (req, res, next) => {
  try {
    const { ownerId, hotelId } = req.params;

    const user = await User.findById(ownerId);
    if (!user) {
      return res.status(404).json({ success: false, message: "Property owner account not found." });
    }

    const hotel = await Hotel.findOne({
      $or: [
        { _id: mongoose.Types.ObjectId.isValid(hotelId) ? hotelId : null },
        { hotelId: hotelId }
      ].filter(cond => cond !== null)
    });

    if (!hotel) {
      return res.status(404).json({ success: false, message: "Hotel not found." });
    }

    // Set ownerId to null
    hotel.ownerId = null;
    await hotel.save();

    // Remove from user's hotelIds array
    user.hotelIds = user.hotelIds.filter(id => id !== hotel.hotelId);
    await user.save();

    // Audit Log
    await logAudit({
      req,
      userId: req.admin?.email || "admin",
      role: req.admin?.role || "Admin",
      action: "HOTEL_UNASSIGNED",
      details: { hotelId: hotel.hotelId, hotelName: hotel.name, ownerId, ownerEmail: user.email }
    });

    res.json({ success: true, message: `Successfully unassigned '${hotel.name}' from ${user.name}.` });
  } catch (e) { next(e); }
});

// ── Send Alert to Manager ──────────────────────────────────────
// POST /api/admin/notify-manager  { hotelId, message, priority }
router.post("/notify-manager", protect, async (req, res, next) => {
  try {
    const { hotelId, message, priority } = req.body;

    // Validate inputs
    if (!hotelId || !message) {
      return res.status(400).json({ error: "hotelId and message are required" });
    }

    // Find hotel
    const hotel = await Hotel.findOne({ hotelId });
    if (!hotel) {
      return res.status(404).json({ error: "Hotel not found" });
    }

    // Find managers assigned to this hotel
    const Manager = mongoose.model("Manager");
    const managers = await Manager.find({
      $or: [
        { assignedHotelId: hotelId },
        { hotelObjectId: hotel._id }
      ]
    }).lean();

    if (!managers || managers.length === 0) {
      return res.status(404).json({ error: "No managers assigned to this hotel" });
    }

    // Create notifications for all managers of the hotel
    const Notification = mongoose.model("Notification");
    const hotelRoomId = hotel.hotelId || hotel._id.toString();
    const notifications = managers.map(manager => ({
      userId: manager._id.toString(),
      hotelId: hotelRoomId,
      role: "manager",
      message: message,
      type: "assistance",
      priority: priority || "medium",
      isRead: false,
      createdAt: new Date()
    }));

    await Notification.insertMany(notifications);

    // Broadcast via Socket.IO if available
    const io = req.app?.get("io") || global?.io;
    if (io) {
      const payload = {
        role: "manager",
        hotelId: hotelRoomId,
        message,
        type: "assistance",
        priority: priority || "medium",
        createdAt: new Date(),
      };
      io.to(`hotel:${hotelRoomId}`).emit("notification", payload);
    }

    res.json({ 
      success: true, 
      message: `Alert sent to ${managers.length} manager(s)`,
      notificationsCreated: managers.length 
    });
  } catch (e) { next(e); }
});

export default router;
