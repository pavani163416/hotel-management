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
import { uploadPublicSupport, validateKycMagicBytes } from "../middleware/uploadMiddleware.js";
import { sendOwnerApprovalEmail, sendOwnerRejectionEmail } from "../utils/emailService.js";

const router = express.Router();
const OWNER_JWT_EXPIRES = "7d";

// Helper for Cloudinary stream upload
const uploadBufferToCloudinary = async (buffer, filename, mimetype) => {
  const { v2: cloudinary } = await import("cloudinary");
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  return new Promise((resolve, reject) => {
    // ── ATOMIC SECURITY CHECK: Aggressive Filename Sanitization ──
    // 1. Strip the extension
    let baseName = filename.includes(".") ? filename.split('.').slice(0, -1).join('.') : filename;
    
    // 2. Strip NULL BYTES (\0) immediately
    baseName = baseName.replace(/\0/g, '');
    
    // 3. Strip EVERYTHING except letters, numbers, dashes, and underscores
    // This absolutely destroys all Path Traversal characters (/, \, ..)
    let safeFilename = baseName.replace(/[^a-zA-Z0-9_-]/g, '');
    
    // 4. Fallback just in case the attacker sent a filename entirely made of garbage characters
    if (!safeFilename) {
      safeFilename = "kyc_document";
    }

    const uploadOptions = {
      folder: "athithigriha/kyc",
      // ── ATOMIC SECURITY CHECK: Treat all uploads as opaque binary blobs ──
      resource_type: "raw", 
      format: undefined, // Let it be an opaque blob
      public_id: `${safeFilename}-${Date.now()}`,
      // Force Content-Disposition: attachment so the browser downloads it instead of rendering it!
      attachment: true 
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



// ── GET /api/owners/application-status ──────────────────
router.get("/application-status", protect, async (req, res, next) => {
  try {
    const app = await OwnerApplication.findOne({ userId: req.user.id });
    if (!app) {
      return res.status(200).json({ success: true, status: "not_applied" });
    }
    return res.status(200).json({ success: true, application: app, status: app.status, kycStatus: app.kycStatus });
  } catch (err) { next(err); }
});

const preventExistingOwners = (req, res, next) => {
  const role = req.user?.role?.toLowerCase();
  if (role === "owner" || role === "admin" || role === "super admin") {
    return res.status(409).json({ 
      success: false, 
      message: "Conflict: You are already an approved property owner or admin." 
    });
  }
  next();
};

const checkApplicationState = async (req, res, next) => {
  try {
    const existingApp = await OwnerApplication.findOne({ userId: req.user.id });
    if (existingApp) {
      if (existingApp.status === "approved") {
        return res.status(409).json({ success: false, message: "Conflict: Application already approved." });
      }
      if (existingApp.status === "pending") {
        return res.status(409).json({ success: false, message: "Conflict: Application is already under review." });
      }
      if (existingApp.status === "processing_upload") {
        return res.status(409).json({ success: false, message: "Conflict: You already have an application submitted or currently processing." });
      }
      // If status is 'rejected', we allow them to proceed and re-apply!
    }
    next();
  } catch (err) {
    next(err);
  }
};

// ── POST /api/owners/apply ──────────────────────────────
router.post("/apply", protect, preventExistingOwners, checkApplicationState, uploadPublicSupport.array("documents", 5), validateKycMagicBytes, async (req, res, next) => {
  try {
    const { businessName, hotelName, hotelAddress, gstNumber, businessRegistrationNumber, docType, email } = req.body;
    if (!businessName || !hotelName || !hotelAddress) {
      return res.status(400).json({ success: false, message: "Business name, hotel name, and hotel address are required." });
    }

    if (email && email.toLowerCase().trim() !== req.user.email.toLowerCase().trim()) {
      return res.status(400).json({ success: false, message: "Application email must match your authenticated account email." });
    }

    // ── ATOMIC SECURITY CHECK: Strict Document Type Whitelist ──
    const ALLOWED_DOC_TYPES = [
      "Aadhar Card",
      "PAN Card",
      "Passport",
      "Business Registration Certificate / Trade License",
      "GST Certificate",
      "document"
    ];
    if (docType && !ALLOWED_DOC_TYPES.includes(docType)) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid document type provided. Please select a valid document category." 
      });
    }

    // 1. ATOMIC LOCKING: Prevent concurrent submissions / state overrides
    const existing = await OwnerApplication.findOne({ userId: req.user.id });
    const wasNew = !existing;

    if (wasNew) {
      try {
        await OwnerApplication.create({
          userId: req.user.id,
          status: "processing_upload",
          kycStatus: "pending"
        });
      } catch (dbErr) {
        if (dbErr.code === 11000) {
          return res.status(409).json({
            success: false,
            message: "Conflict: You already have an application submitted or currently processing."
          });
        }
        throw dbErr;
      }
    } else {
      // It must be rejected (since approved/pending/processing_upload are blocked by checkApplicationState)
      const locked = await OwnerApplication.findOneAndUpdate(
        { userId: req.user.id, status: "rejected" },
        { $set: { status: "processing_upload", kycStatus: "pending" } },
        { new: true }
      );
      if (!locked) {
        return res.status(409).json({
          success: false,
          message: "Conflict: You already have an application submitted or currently processing."
        });
      }
    }

    const files = req.files || [];
    const docs = [];
    
    for (const file of files) {
      try {
        const result = await uploadBufferToCloudinary(file.buffer, file.originalname, file.mimetype);
        docs.push({
          type: docType || "document",
          url: result.secure_url,
          public_id: result.public_id,
          uploadedAt: new Date(),
        });
      } catch (err) {
        logger.error("Cloudinary upload error mid-batch for KYC:", err);
        
        // ── ATOMIC ROLLBACK: Delete successfully uploaded files to prevent orphaned storage ──
        for (const uploadedDoc of docs) {
          if (uploadedDoc.public_id) {
            try {
               const { v2: cloudinary } = await import("cloudinary");
               await cloudinary.uploader.destroy(uploadedDoc.public_id);
               logger.info(`Rolled back orphaned file: ${uploadedDoc.public_id}`);
            } catch (destroyErr) {
               logger.error("CRITICAL: Failed to delete orphaned file during rollback", destroyErr);
            }
          }
        }

        // Revert the lock
        if (wasNew) {
          await OwnerApplication.deleteOne({ userId: req.user.id }).catch(() => {});
        } else {
          await OwnerApplication.findOneAndUpdate(
            { userId: req.user.id, status: "processing_upload" },
            { $set: { status: "rejected" } }
          ).catch(() => {});
        }

        return res.status(500).json({ success: false, message: "Upload failed. Transaction rolled back." });
      }
    }

    // 3. FINAL COMMIT: Update the locked placeholder with final data
    const app = await OwnerApplication.findOneAndUpdate(
      { userId: req.user.id },
      {
        businessName,
        hotelName,
        hotelAddress,
        gstNumber: gstNumber || "",
        businessRegistrationNumber: businessRegistrationNumber || "",
        kycDocuments: docs,
        status: "pending",
        kycStatus: "pending",
      },
      { new: true }
    );

    // Notify admin panel about the new property application
    try {
      const { sendNotification } = await import("../utils/notificationService.js");
      const user = await User.findById(req.user.id);
      await sendNotification({
        role: "admin",
        type: "system",
        message: `📋 New property owner application received from ${user?.name || req.user.email} (${businessName} — ${hotelName}). Please review in Property Owners section.`,
      });
    } catch (notifErr) {
      logger.warn("Failed to send admin notification for new property application:", notifErr);
    }

    return res.status(200).json({ success: true, message: "Application submitted successfully.", data: app });
  } catch (err) { next(err); }
});

// ── GET /api/owners/dashboard ────────────────────────────
router.get("/dashboard", protect, authorizeRoles("owner"), async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    const hotels = await Hotel.find({ ownerId: user._id });
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
        userId: u._id || null,
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
        // Property & Business details from the application
        businessName: app.businessName || "",
        hotelName: app.hotelName || "",
        hotelAddress: app.hotelAddress || "",
        gstNumber: app.gstNumber || "",
        businessRegistrationNumber: app.businessRegistrationNumber || "",
      };
    });

    return res.status(200).json({ success: true, count: mapped.length, data: mapped });
  } catch (err) { next(err); }
});

// PATCH /api/owners/admin/:id/approve
router.patch("/admin/:id/approve", protect, authorizeRoles("Super Admin", "admin"), async (req, res, next) => {
  try {
    // ── ATOMIC SECURITY CHECK: Find and Update in one strict operation ──
    const app = await OwnerApplication.findOneAndUpdate(
      { _id: req.params.id, status: "pending" },
      { 
        $set: { 
          status: "approved", 
          kycStatus: "approved", 
          adminNotes: req.body.notes || "" 
        } 
      },
      { new: true }
    );
    if (!app) {
      return res.status(409).json({ 
        success: false, 
        message: "Conflict: Application already processed or not found." 
      });
    }

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
        message: `🎉 Your property owner application has been approved! You can now list your hotels on AthithiGriha.`,
      });
    } catch { }

    return res.status(200).json({ success: true, message: "Owner approved.", data: app });
  } catch (err) { next(err); }
});

// PATCH /api/owners/admin/:id/reject
router.patch("/admin/:id/reject", protect, authorizeRoles("Super Admin", "admin"), async (req, res, next) => {
  try {
    // ── ATOMIC SECURITY CHECK: Find and Update in one strict operation ──
    const app = await OwnerApplication.findOneAndUpdate(
      { _id: req.params.id, status: "pending" },
      { $set: { status: "rejected", adminNotes: req.body.reason || "" } },
      { new: true }
    );
    if (!app) {
      return res.status(409).json({ 
        success: false, 
        message: "Conflict: Application already processed or not found." 
      });
    }

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
    } catch { }

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
        message: `Your AthithiGriha owner account has been suspended. Reason: ${req.body.reason || "Contact support for details."}`,
      });
    } catch { }

    return res.status(200).json({ success: true, message: "Owner suspended.", data: app });
  } catch (err) { next(err); }
});

export default router;
