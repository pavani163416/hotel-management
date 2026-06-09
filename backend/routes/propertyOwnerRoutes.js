/**
 * Property Owner Routes (Unified Customer-to-Owner Flow)
 */
import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import OwnerApplication from "../models/OwnerApplication.js";
import Hotel from "../models/Hotel.js";
import Booking from "../models/Booking.js";
import { protect, authorizeRoles } from "../middleware/auth.js";
import logger from "../utils/logger.js";
import { uploadPublicSupport } from "../middleware/uploadMiddleware.js";
import { sendOwnerApprovalEmail, sendOwnerRejectionEmail } from "../utils/emailService.js";

const router = express.Router();
const OWNER_JWT_EXPIRES = "7d";

// Helper for Cloudinary stream upload
const uploadBufferToCloudinary = async (buffer, filename, mimetype) => {
  const { v2: cloudinary } = await import("cloudinary");
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: "luxestay/kyc",
      resource_type: "auto", 
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

// Middleware: verify general logged-in user
const verifyUser = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Authentication required." });
  }
  try {
    const decoded = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired token." });
  }
};

// Middleware: verify owner role
const verifyOwner = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Authentication required." });
  }
  try {
    const decoded = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
    if (decoded.role !== "owner") {
      return res.status(403).json({ success: false, message: "Access forbidden: owner role required." });
    }
    req.owner = decoded;
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired token." });
  }
};

// ── GET /api/owners/application-status ──────────────────
router.get("/application-status", verifyUser, async (req, res, next) => {
  try {
    const app = await OwnerApplication.findOne({ userId: req.user.id });
    if (!app) {
      return res.status(200).json({ success: true, status: "not_applied" });
    }
    return res.status(200).json({ success: true, application: app, status: app.status, kycStatus: app.kycStatus });
  } catch (err) { next(err); }
});

// ── POST /api/owners/apply ──────────────────────────────
router.post("/apply", verifyUser, uploadPublicSupport.array("documents", 5), async (req, res, next) => {
  try {
    const { businessName, hotelName, hotelAddress, gstNumber, businessRegistrationNumber, docType } = req.body;
    if (!businessName || !hotelName || !hotelAddress) {
      return res.status(400).json({ success: false, message: "Business name, hotel name, and hotel address are required." });
    }

    const files = req.files || [];
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

    // Create or update application
    const app = await OwnerApplication.findOneAndUpdate(
      { userId: req.user.id },
      {
        businessName,
        hotelName,
        hotelAddress,
        gstNumber: gstNumber || "",
        businessRegistrationNumber: businessRegistrationNumber || "",
        $push: { kycDocuments: { $each: docs } },
        status: "pending",
        kycStatus: "pending",
      },
      { new: true, upsert: true }
    );

    return res.status(200).json({ success: true, message: "Application submitted successfully.", data: app });
  } catch (err) { next(err); }
});

// ── GET /api/owners/dashboard ────────────────────────────
router.get("/dashboard", verifyOwner, async (req, res, next) => {
  try {
    const user = await User.findById(req.owner.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    const hotels = await Hotel.find({ hotelId: { $in: user.hotelIds || [] } });
    const hotelObjectIds = hotels.map((h) => h._id);
    const bookings = await Booking.find({ hotel: { $in: hotelObjectIds } });
    const revenue = bookings.filter((b) => b.paymentStatus === "PAID").reduce((s, b) => s + (b.totalAmount || 0), 0);

    const app = await OwnerApplication.findOne({ userId: user._id });

    return res.status(200).json({
      success: true,
      data: {
        owner: {
          id: user._id,
          name: user.name,
          email: user.email,
          status: "approved",
          kycStatus: app ? app.kycStatus : "approved",
          kycDocuments: app ? app.kycDocuments : [],
        },
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
    const apps = await OwnerApplication.find(filter).populate("userId").sort({ createdAt: -1 });

    const mapped = apps.map(app => {
      const u = app.userId || {};
      return {
        _id: app._id,
        name: u.name || "Unknown",
        email: u.email || "",
        phone: u.phone || "",
        status: app.status,
        kycStatus: app.kycStatus,
        isEmailVerified: u.isVerified || false,
        kycDocuments: app.kycDocuments || [],
        hotelIds: u.hotelIds || [],
        createdAt: app.createdAt,
        adminNotes: app.adminNotes || "",
      };
    });

    return res.status(200).json({ success: true, count: mapped.length, data: mapped });
  } catch (err) { next(err); }
});

// PATCH /api/owners/admin/:id/approve
router.patch("/admin/:id/approve", protect, authorizeRoles("Super Admin", "admin"), async (req, res, next) => {
  try {
    const app = await OwnerApplication.findById(req.params.id);
    if (!app) return res.status(404).json({ success: false, message: "Application not found." });

    app.status = "approved";
    app.kycStatus = "approved";
    app.adminNotes = req.body.notes || "";
    await app.save();

    const user = await User.findById(app.userId);
    if (user) {
      user.role = "owner";
      await user.save();
      
      // Trigger approval email notification
      await sendOwnerApprovalEmail({ to: user.email, name: user.name }).catch((err) => {
        logger.error("Error sending owner approval email:", err);
      });
    }

    try {
      const { sendNotification } = await import("../utils/notificationService.js");
      await sendNotification({
        userId: user.email,
        role: "customer",
        type: "system",
        message: `🎉 Your property owner application has been approved! You can now list your hotels on LuxeStay.`,
      });
    } catch {}

    return res.status(200).json({ success: true, message: "Owner approved.", data: app });
  } catch (err) { next(err); }
});

// PATCH /api/owners/admin/:id/reject
router.patch("/admin/:id/reject", protect, authorizeRoles("Super Admin", "admin"), async (req, res, next) => {
  try {
    const app = await OwnerApplication.findByIdAndUpdate(
      req.params.id,
      { status: "rejected", adminNotes: req.body.reason || "" },
      { new: true }
    );
    if (!app) return res.status(404).json({ success: false, message: "Application not found." });

    const user = await User.findById(app.userId);
    if (user) {
      // Trigger rejection email notification
      await sendOwnerRejectionEmail({
        to: user.email,
        name: user.name,
        reason: req.body.reason || "Please verify your uploaded business license or identity proof documents and try again."
      }).catch((err) => {
        logger.error("Error sending owner rejection email:", err);
      });
    }

    try {
      const { sendNotification } = await import("../utils/notificationService.js");
      await sendNotification({
        userId: user.email,
        role: "customer",
        type: "system",
        message: `Your property owner application was not approved. Reason: ${req.body.reason || "Please contact support for details."}`,
      });
    } catch {}

    return res.status(200).json({ success: true, message: "Owner rejected.", data: app });
  } catch (err) { next(err); }
});

// PATCH /api/owners/admin/:id/suspend
router.patch("/admin/:id/suspend", protect, authorizeRoles("Super Admin", "admin"), async (req, res, next) => {
  try {
    const app = await OwnerApplication.findByIdAndUpdate(
      req.params.id,
      { status: "suspended", adminNotes: req.body.reason || "" },
      { new: true }
    );
    if (!app) return res.status(404).json({ success: false, message: "Application not found." });

    const user = await User.findById(app.userId);
    if (user) {
      user.role = "customer";
      await user.save();
    }

    try {
      const { sendNotification } = await import("../utils/notificationService.js");
      await sendNotification({
        userId: user.email,
        role: "customer",
        type: "system",
        message: `Your LuxeStay owner account has been suspended. Reason: ${req.body.reason || "Contact support for details."}`,
      });
    } catch {}

    return res.status(200).json({ success: true, message: "Owner suspended.", data: app });
  } catch (err) { next(err); }
});

export default router;
