/**
 * Property Owner Routes
 * Public: register, verify-email, verify-phone, login
 * Owner: dashboard, hotels, profile
 * Admin: list, approve, reject, suspend
 */
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import PropertyOwner from "../models/PropertyOwner.js";
import Hotel from "../models/Hotel.js";
import Booking from "../models/Booking.js";
import { protect, authorizeRoles } from "../middleware/auth.js";
import { cacheSet, cacheGet } from "../cache/redisCache.js";
import { sendOtpEmail } from "../utils/emailService.js";
import logger from "../utils/logger.js";
import { uploadPublicSupport } from "../middleware/uploadMiddleware.js";

const router = express.Router();
const JWT_SECRET = () => process.env.JWT_SECRET;
const OWNER_JWT_EXPIRES = "7d";

// Helper for Cloudinary stream upload
const uploadBufferToCloudinary = async (buffer, filename, mimetype) => {
  const { v2: cloudinary } = await import("cloudinary");
  return new Promise((resolve, reject) => {
    const isPdf = mimetype === "application/pdf";
    const uploadOptions = {
      folder: "luxestay/kyc",
      resource_type: isPdf ? "raw" : "auto", 
      public_id: filename.split('.')[0] + "-" + Date.now(),
    };
    const uploadStream = cloudinary.uploader.upload_stream(
      uploadOptions,
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      }
    );
    uploadStream.end(buffer);
  });
};

// ── Middleware: verify owner JWT ─────────────────────────
const verifyOwner = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Authentication required." });
  }
  try {
    const decoded = jwt.verify(header.split(" ")[1], JWT_SECRET());
    if (decoded.role !== "property_owner") {
      return res.status(403).json({ success: false, message: "Access forbidden: property owner role required." });
    }
    req.owner = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired token." });
  }
};

// ── POST /api/owners/register ────────────────────────────
router.post("/register", async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password || !phone) {
      return res.status(400).json({ success: false, message: "All fields are required." });
    }
    const existing = await PropertyOwner.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ success: false, message: "An account with this email already exists." });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const otp = crypto.randomInt(100000, 999999).toString();
    await cacheSet(`owner_email_otp_${email.toLowerCase()}`, otp, 300);

    const owner = await PropertyOwner.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      phone: phone.trim(),
    });

    try {
      await sendOtpEmail({ to: owner.email, name: owner.name, otp });
    } catch (e) {
      logger.warn("Owner registration: email send failed", { error: e.message });
    }

    return res.status(201).json({
      success: true,
      message: "Registration successful. Please verify your email.",
      data: { email: owner.email, isEmailVerified: false },
    });
  } catch (err) { next(err); }
});

// ── POST /api/owners/verify-email ────────────────────────
router.post("/verify-email", async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const stored = await cacheGet(`owner_email_otp_${email?.toLowerCase()}`);
    if (!stored || stored !== String(otp)) {
      return res.status(400).json({ success: false, message: "Invalid or expired verification code." });
    }
    await PropertyOwner.findOneAndUpdate({ email: email.toLowerCase() }, { isEmailVerified: true });
    return res.status(200).json({ success: true, message: "Email verified successfully." });
  } catch (err) { next(err); }
});

// ── POST /api/owners/login ───────────────────────────────
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required." });
    }
    const owner = await PropertyOwner.findOne({ email: email.toLowerCase() }).select("+passwordHash");
    if (!owner) {
      return res.status(401).json({ success: false, message: "Invalid credentials." });
    }
    const valid = await bcrypt.compare(password, owner.passwordHash);
    if (!valid) {
      return res.status(401).json({ success: false, message: "Invalid credentials." });
    }
    if (!owner.isEmailVerified) {
      return res.status(403).json({ success: false, message: "Please verify your email before logging in.", code: "EMAIL_NOT_VERIFIED" });
    }
    if (owner.status === "suspended") {
      return res.status(403).json({ success: false, message: "Your account has been suspended. Contact support." });
    }
    if (owner.status === "rejected") {
      return res.status(403).json({ success: false, message: "Your application was rejected. Contact support." });
    }

    owner.lastLogin = new Date();
    await owner.save();

    const token = jwt.sign(
      { id: owner._id, email: owner.email, name: owner.name, role: "property_owner", status: owner.status },
      JWT_SECRET(),
      { expiresIn: OWNER_JWT_EXPIRES }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      data: {
        id: owner._id, name: owner.name, email: owner.email, phone: owner.phone,
        status: owner.status, kycStatus: owner.kycStatus,
        isEmailVerified: owner.isEmailVerified, isPhoneVerified: owner.isPhoneVerified,
        token,
      },
    });
  } catch (err) { next(err); }
});

// ── POST /api/owners/kyc-documents ──────────────────────
router.post("/kyc-documents", verifyOwner, uploadPublicSupport.array("documents", 5), async (req, res, next) => {
  try {
    const { docType } = req.body;
    const files = req.files || [];
    if (!files.length) {
      return res.status(400).json({ success: false, message: "No files uploaded." });
    }
    
    const docs = [];
    for (const file of files) {
      try {
        const result = await uploadBufferToCloudinary(file.buffer, file.originalname, file.mimetype);
        docs.push({
          type: docType || "document",
          url: result.secure_url,
          uploadedAt: new Date(),
        });
      } catch (err) {
        logger.error("Cloudinary upload error for KYC:", err);
        return res.status(500).json({ success: false, message: "Failed to upload document to cloud storage." });
      }
    }

    await PropertyOwner.findByIdAndUpdate(req.owner.id, {
      $push: { kycDocuments: { $each: docs } },
      kycStatus: "pending",
    });
    return res.status(200).json({ success: true, message: "Documents uploaded. KYC review pending." });
  } catch (err) { next(err); }
});

// ── GET /api/owners/dashboard ────────────────────────────
router.get("/dashboard", verifyOwner, async (req, res, next) => {
  try {
    const owner = await PropertyOwner.findById(req.owner.id);
    if (!owner) return res.status(404).json({ success: false, message: "Owner not found." });

    const hotels = await Hotel.find({ hotelId: { $in: owner.hotelIds } });
    const hotelObjectIds = hotels.map((h) => h._id);
    const bookings = await Booking.find({ hotel: { $in: hotelObjectIds } });
    const revenue = bookings.filter((b) => b.paymentStatus === "PAID").reduce((s, b) => s + (b.totalAmount || 0), 0);

    return res.status(200).json({
      success: true,
      data: {
        owner: { id: owner._id, name: owner.name, email: owner.email, status: owner.status, kycStatus: owner.kycStatus, kycDocuments: owner.kycDocuments },
        hotels: hotels.map((h) => ({ id: h._id, hotelId: h.hotelId, name: h.name, location: h.location, isActive: h.isActive })),
        stats: { totalHotels: hotels.length, totalBookings: bookings.length, totalRevenue: revenue },
        bookings: bookings.slice(0, 20),
      },
    });
  } catch (err) { next(err); }
});

// ── ADMIN ROUTES ─────────────────────────────────────────

// GET /api/owners/admin/list
router.get("/admin/list", protect, authorizeRoles("Super Admin", "admin"), async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const owners = await PropertyOwner.find(filter).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: owners.length, data: owners });
  } catch (err) { next(err); }
});

// PATCH /api/owners/admin/:id/approve
router.patch("/admin/:id/approve", protect, authorizeRoles("Super Admin", "admin"), async (req, res, next) => {
  try {
    const owner = await PropertyOwner.findByIdAndUpdate(
      req.params.id,
      { status: "approved", kycStatus: "approved", adminNotes: req.body.notes || "" },
      { new: true }
    );
    if (!owner) return res.status(404).json({ success: false, message: "Owner not found." });

    // Send notification
    try {
      const { sendNotification } = await import("../utils/notificationService.js");
      await sendNotification({
        userId: owner.email,
        role: "customer",
        type: "system",
        message: `🎉 Your property owner application has been approved! You can now list your hotels on LuxeStay.`,
      });
    } catch {}

    // Send email
    try {
      const { sendPasswordResetEmail } = await import("../utils/emailService.js");
      await sendPasswordResetEmail({
        to: owner.email,
        name: owner.name,
        resetUrl: `${process.env.FRONTEND_URL || "https://hotel-management-frontend-puce.vercel.app"}/owner-portal`,
        subject: "Your LuxeStay Owner Application is Approved!",
        message: "Congratulations! Your application has been approved. Sign in to your owner portal to start listing your properties.",
      });
    } catch {}

    return res.status(200).json({ success: true, message: "Owner approved.", data: owner });
  } catch (err) { next(err); }
});

// PATCH /api/owners/admin/:id/reject
router.patch("/admin/:id/reject", protect, authorizeRoles("Super Admin", "admin"), async (req, res, next) => {
  try {
    const owner = await PropertyOwner.findByIdAndUpdate(
      req.params.id,
      { status: "rejected", adminNotes: req.body.reason || "" },
      { new: true }
    );
    if (!owner) return res.status(404).json({ success: false, message: "Owner not found." });

    try {
      const { sendNotification } = await import("../utils/notificationService.js");
      await sendNotification({
        userId: owner.email,
        role: "customer",
        type: "system",
        message: `Your property owner application was not approved. Reason: ${req.body.reason || "Please contact support for details."}`,
      });
    } catch {}

    return res.status(200).json({ success: true, message: "Owner rejected.", data: owner });
  } catch (err) { next(err); }
});

// PATCH /api/owners/admin/:id/suspend
router.patch("/admin/:id/suspend", protect, authorizeRoles("Super Admin", "admin"), async (req, res, next) => {
  try {
    const owner = await PropertyOwner.findByIdAndUpdate(
      req.params.id,
      { status: "suspended", adminNotes: req.body.reason || "" },
      { new: true }
    );
    if (!owner) return res.status(404).json({ success: false, message: "Owner not found." });

    try {
      const { sendNotification } = await import("../utils/notificationService.js");
      await sendNotification({
        userId: owner.email,
        role: "customer",
        type: "system",
        message: `Your LuxeStay owner account has been suspended. Reason: ${req.body.reason || "Contact support for details."}`,
      });
    } catch {}

    return res.status(200).json({ success: true, message: "Owner suspended.", data: owner });
  } catch (err) { next(err); }
});

export default router;
