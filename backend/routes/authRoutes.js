/**
 * authRoutes.js — Customer authentication
 *
 * Uses the dedicated `users` collection (User model) for credentials.
 * The `guests` collection remains for booking/profile data only.
 *
 * POST /api/auth/register  — create user account + guest record
 * POST /api/auth/login     — sign in, returns JWT
 * GET  /api/auth/me        — get current user (requires token)
 * GET  /api/auth/bookings  — get bookings for logged-in user
 */

import express from "express";
import bcrypt  from "bcryptjs";
import jwt     from "jsonwebtoken";
import crypto  from "crypto";
import mongoose from "mongoose";
import User    from "../models/User.js";
import Guest   from "../models/Guest.js";
import Booking from "../models/Booking.js";
import Manager from "../models/Manager.js";
import connectAdminDB from "../config/adminDb.js";
import { authLimiter } from "../middleware/rateLimiter.js";
import logger  from "../utils/logger.js";
import { sendPasswordResetEmail } from "../utils/emailService.js";

import { OAuth2Client } from "google-auth-library";
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const router = express.Router();

const getSecret  = () => {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET missing");
  return s;
};
const JWT_EXPIRES = "7d";

const twilioAuthHeaders = () => {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
  if (!sid || !token || !serviceSid) {
    throw new Error("Twilio verification is not configured.");
  }
  return {
    auth: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
    serviceSid,
  };
};

let AdminUserModel = null;
const getAdminUserModel = async () => {
  if (AdminUserModel) return AdminUserModel;
  const conn = await connectAdminDB();
  if (!conn) return null;

  const schema = new mongoose.Schema({
    name:                String,
    email:               { type: String, lowercase: true, trim: true },
    password:            String,
    role:                String,
    isActive:            Boolean,
    lastLogin:           Date,
    resetPasswordToken:   String,
    resetPasswordExpires: Date,
  }, { collection: "adminusers" });

  AdminUserModel = conn.models.AdminUser || conn.model("AdminUser", schema);
  return AdminUserModel;
};

const createResetToken = () => {
  const token = crypto.randomBytes(24).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
  return { token, hashedToken };
};

const normalizePhoneNumber = (phone) => {
  if (!phone) return "";
  const normalized = phone.trim().replace(/[\s()\-]/g, "");
  if (!normalized.startsWith("+")) {
    throw new Error("Phone number must include a country code and start with +.");
  }
  return normalized;
};

const sendTwilioVerification = async (normalizedPhone) => {
  const { auth, serviceSid } = twilioAuthHeaders();
  const body = new URLSearchParams({ To: normalizedPhone, Channel: "sms" }).toString();
  const response = await fetch(`https://verify.twilio.com/v2/Services/${serviceSid}/Verifications`, {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const data = await response.json();
  if (!response.ok || data.status !== "pending") {
    throw new Error(data.message || "Unable to send OTP. Please try again.");
  }
  return data;
};

const verifyTwilioCode = async (normalizedPhone, code) => {
  const { auth, serviceSid } = twilioAuthHeaders();
  const body = new URLSearchParams({ To: normalizedPhone, Code: code }).toString();
  const response = await fetch(`https://verify.twilio.com/v2/Services/${serviceSid}/VerificationCheck`, {
    method: "POST",
    headers: {
      Authorization: auth,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Unable to verify OTP.");
  }
  return data;
};

// ── Middleware: verify customer JWT ──────────────────────
export const verifyCustomerToken = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Authentication required." });
  }
  try {
    req.customer = jwt.verify(header.split(" ")[1], getSecret());
    next();
  } catch (err) {
    const msg = err.name === "TokenExpiredError"
      ? "Session expired. Please sign in again."
      : "Invalid token.";
    return res.status(401).json({ success: false, message: msg });
  }
};

// ── POST /api/auth/register ───────────────────────────────
router.post("/register", authLimiter, async (req, res, next) => {
  try {
    const { name, email, password, phone, city } = req.body;

    if (!name || !email || !password || !phone) {
      return res.status(400).json({
        success: false,
        message: "Name, email, password and phone are required.",
      });
    }
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters.",
      });
    }

    const normalEmail = email.toLowerCase().trim();

    // Check if user account already exists
    const existingUser = await User.findOne({ email: normalEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists. Please sign in.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // ── Create User record (credentials) ─────────────
    const user = await User.create({
      name:         name.trim(),
      email:        normalEmail,
      passwordHash,
      phone:        phone.trim(),
      city:         city?.trim() || "",
    });

    // ── Upsert Guest record (booking profile) ─────────
    // If a guest record already exists from a previous booking, link it.
    // Otherwise create a new one.
    let guest = await Guest.findOne({ email: normalEmail });
    if (!guest) {
      guest = await Guest.create({
        name:  name.trim(),
        email: normalEmail,
        phone: phone.trim(),
        city:  city?.trim() || "",
      });
    }

    // Link user → guest
    user.guestId = guest._id;
    await user.save();

    const token = jwt.sign(
      { id: user._id, guestId: guest._id, email: user.email, name: user.name, role: "customer" },
      getSecret(),
      { expiresIn: JWT_EXPIRES }
    );

    logger.info("Customer registered", { email: normalEmail });

    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      data: {
        id:    user._id,
        name:  user.name,
        email: user.email,
        phone: user.phone,
        city:  user.city,
        profileImage: user.profileImage,
        coverImage:   user.coverImage,
        paymentMethods: user.paymentMethods,
        token,
      },
    });
  } catch (err) { next(err); }
});

// ── POST /api/auth/forgot-password ─────────────────────────
router.post("/forgot-password", authLimiter, async (req, res, next) => {
  try {
    const email = (req.body.email || "").toLowerCase().trim();
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required." });
    }

    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
    const [manager, AdminModel] = await Promise.all([
      Manager.findOne({ email, isActive: true }),
      getAdminUserModel(),
    ]);

    const adminUser = AdminModel ? await AdminModel.findOne({ email, isActive: true }) : null;

    if (manager || adminUser) {
      const { token, hashedToken } = createResetToken();
      const expires = new Date(Date.now() + 1000 * 60 * 60);
      const baseUrl = req.body.originUrl || req.headers.origin || (process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.split(',')[0] : "http://localhost:5174");
      const url = `${baseUrl}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;

      if (manager) {
        manager.resetPasswordToken = hashedToken;
        manager.resetPasswordExpires = expires;
        await manager.save();
      }
      if (adminUser) {
        adminUser.resetPasswordToken = hashedToken;
        adminUser.resetPasswordExpires = expires;
        await adminUser.save();
      }

      await sendPasswordResetEmail({
        to: email,
        name: manager?.name || adminUser?.name || "LuxeStay Admin",
        resetUrl: url,
      });
    } else if (adminEmail === email) {
      logger.warn("Password reset requested for env admin email; admin account uses env credentials.", { email });
    }

    return res.status(200).json({
      success: true,
      message: "If an account exists for this email, a password reset link has been sent.",
    });
  } catch (error) {
    next(error);
  }
});

// ── POST /api/auth/reset-password ────────────────────────
router.post("/reset-password", authLimiter, async (req, res, next) => {
  try {
    const { email, token, password } = req.body;
    if (!email || !token || !password) {
      return res.status(400).json({ success: false, message: "Email, token, and new password are required." });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters." });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const now = new Date();

    const [manager, AdminModel] = await Promise.all([
      Manager.findOne({ email: email.toLowerCase().trim(), resetPasswordToken: hashedToken, resetPasswordExpires: { $gt: now } }),
      getAdminUserModel(),
    ]);
    const adminUser = AdminModel ? await AdminModel.findOne({ email: email.toLowerCase().trim(), resetPasswordToken: hashedToken, resetPasswordExpires: { $gt: now } }) : null;

    if (!manager && !adminUser) {
      return res.status(400).json({ success: false, message: "Invalid or expired reset link." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    if (manager) {
      manager.password = passwordHash;
      manager.resetPasswordToken = null;
      manager.resetPasswordExpires = null;
      await manager.save();
    }
    if (adminUser) {
      adminUser.password = passwordHash;
      adminUser.resetPasswordToken = null;
      adminUser.resetPasswordExpires = null;
      await adminUser.save();
    }

    return res.status(200).json({ success: true, message: "Password has been reset. Please sign in with your new password." });
  } catch (error) {
    next(error);
  }
});

// ── POST /api/auth/login ──────────────────────────────────
router.post("/login", authLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required.",
      });
    }

    const normalEmail = email.toLowerCase().trim();

    // Look up user with passwordHash explicitly included
    const user = await User.findOne({ email: normalEmail }).select("+passwordHash");

    if (!user || !user.passwordHash) {
      return res.status(401).json({ success: false, message: "Invalid credentials." });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: "Account is disabled. Please contact support." });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      logger.warn("Failed customer login", { email: normalEmail, ip: req.ip });
      return res.status(401).json({ success: false, message: "Invalid credentials." });
    }

    // Update last login timestamp
    user.lastLogin = new Date();
    await user.save();

    // Ensure guest record is linked
    if (!user.guestId) {
      let guest = await Guest.findOne({ email: normalEmail });
      if (!guest) {
        // Create guest record if it doesn't exist
        guest = await Guest.create({
          name: user.name,
          email: normalEmail,
          phone: user.phone || "",
          city: user.city || "",
          profileImage: user.profileImage || "",
        });
      }
      user.guestId = guest._id;
      await user.save();
    }

    const token = jwt.sign(
      { id: user._id, guestId: user.guestId?.toString() || user.guestId, email: user.email, name: user.name, role: "customer" },
      getSecret(),
      { expiresIn: JWT_EXPIRES }
    );

    logger.info("Customer login", { email: normalEmail });

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      data: {
        id:    user._id,
        name:  user.name,
        email: user.email,
        phone: user.phone,
        city:  user.city,
        profileImage: user.profileImage,
        coverImage:   user.coverImage,
        paymentMethods: user.paymentMethods,
        token,
      },
    });
  } catch (err) { next(err); }
});

router.post("/phone/send", authLimiter, async (req, res, next) => {
  try {
    const phone = req.body.phone?.trim();
    if (!phone) {
      return res.status(400).json({ success: false, message: "Phone number is required." });
    }

    const normalizedPhone = normalizePhoneNumber(phone);
    await sendTwilioVerification(normalizedPhone);
    return res.status(200).json({ success: true, message: "OTP sent successfully." });
  } catch (err) {
    logger.error(err.message, "Phone OTP send failed");
    const status = err.message?.includes("country code") ? 400 : 500;
    return res.status(status).json({ success: false, message: err.message || "Unable to send OTP." });
  }
});

router.post("/phone/verify", authLimiter, async (req, res, next) => {
  try {
    const phone = req.body.phone?.trim();
    const code = req.body.code?.trim();
    if (!phone || !code) {
      return res.status(400).json({ success: false, message: "Phone and OTP code are required." });
    }

    const normalizedPhone = normalizePhoneNumber(phone);
    const verification = await verifyTwilioCode(normalizedPhone, code);
    if (verification.status !== "approved") {
      return res.status(401).json({ success: false, message: "OTP verification failed." });
    }

    let user = await User.findOne({ phone: normalizedPhone }).select("+passwordHash");
    if (!user) {
      const safePhone = normalizedPhone.replace(/\D/g, "") || "unknown";
      const generatedEmail = `${safePhone || "no-phone"}@phone.luxe`;
      const generatedName = `Guest ${safePhone.slice(-4) || safePhone}`;
      const passwordHash = await bcrypt.hash(Math.random().toString(36) + Date.now(), 12);

      user = await User.create({
        name: generatedName,
        email: generatedEmail,
        passwordHash,
        phone: normalizedPhone,
      });

      const guest = await Guest.create({
        name: generatedName,
        email: generatedEmail,
        phone: normalizedPhone,
      });
      user.guestId = guest._id;
      await user.save();
    }

    if (!user.guestId) {
      let guest = await Guest.findOne({ phone: normalizedPhone });
      if (!guest) {
        guest = await Guest.create({
          name: user.name,
          email: user.email,
          phone: user.phone,
        });
      }
      user.guestId = guest._id;
      await user.save();
    }

    const token = jwt.sign(
      { id: user._id, guestId: user.guestId, email: user.email, name: user.name, role: "customer" },
      getSecret(),
      { expiresIn: JWT_EXPIRES }
    );

    return res.status(200).json({
      success: true,
      message: "Phone verification successful.",
      data: {
        id:    user._id,
        name:  user.name,
        email: user.email,
        phone: user.phone,
        city:  user.city,
        profileImage: user.profileImage,
        coverImage:   user.coverImage,
        paymentMethods: user.paymentMethods,
        token,
      },
    });
  } catch (err) {
    logger.error(err.message, "Phone OTP verify failed");
    return res.status(500).json({ success: false, message: err.message || "Unable to verify OTP." });
  }
});

// ── POST /api/auth/google ──────────────────────────────────
router.post("/google", async (req, res, next) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ success: false, message: "ID Token is required" });

    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name, picture, sub: googleId } = payload;

    let user = await User.findOne({ email });

    if (!user) {
      // Create User
      user = await User.create({
        name,
        email,
        passwordHash: await bcrypt.hash(Math.random().toString(36), 10),
        phone: "",
        profileImage: picture || "",
      });

      // Create linked Guest
      const guest = await Guest.create({
        name,
        email,
        phone: "",
        profileImage: picture || "",
      });

      user.guestId = guest._id;
      await user.save();
      
      logger.info({ email, name }, "New Google user registered with Guest record");
    }

    const token = jwt.sign(
      { id: user._id, guestId: user.guestId, email: user.email, name: user.name, role: "customer" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      data: {
        id:    user._id,
        name:  user.name,
        email: user.email,
        phone: user.phone,
        city:  user.city,
        profileImage: user.profileImage,
        coverImage:   user.coverImage,
        paymentMethods: user.paymentMethods,
        token,
      },
    });
  } catch (err) {
    logger.error(err.message, "Google Auth Error");
    res.status(401).json({ success: false, message: "Invalid Google Token" });
  }
});

// ── GET /api/auth/me ──────────────────────────────────────
router.get("/me", verifyCustomerToken, async (req, res, next) => {
  try {
    const user = await User.findById(req.customer.id);
    res.json({
      success: true,
      data: {
        id:      user._id,
        name:    user.name,
        email:   user.email,
        phone:   user.phone,
        city:    user.city,
        profileImage: user.profileImage,
        coverImage:   user.coverImage,
        paymentMethods: user.paymentMethods,
        guestId:      user.guestId,
      },
    });
  } catch (err) { next(err); }
});

// ── PATCH /api/auth/profile ───────────────────────────────
router.patch("/profile", verifyCustomerToken, async (req, res, next) => {
  try {
    const { name, phone, city, profileImage, coverImage } = req.body;
    
    const user = await User.findById(req.customer.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    if (name) user.name = name.trim();
    if (phone) user.phone = phone.trim();
    if (city) user.city = city.trim();
    if (profileImage !== undefined) user.profileImage = profileImage;
    if (coverImage !== undefined) user.coverImage = coverImage;

    console.log(`[ProfileUpdate] Saving user ${user.email}: profile=${profileImage}, cover=${coverImage}`);
    await user.save();

    // Sync with Guest record if exists
    if (user.guestId) {
      const guest = await Guest.findById(user.guestId);
      if (guest) {
        if (name) guest.name = name.trim();
        if (phone) guest.phone = phone.trim();
        if (city) guest.city = city.trim();
        if (profileImage !== undefined) guest.profileImage = profileImage;
        if (coverImage !== undefined) guest.coverImage = coverImage;
        await guest.save();
      }
    }

    res.json({
      success: true,
      message: "Profile updated successfully.",
      data: {
        id:      user._id,
        name:    user.name,
        email:   user.email,
        phone:   user.phone,
        city:    user.city,
        profileImage: user.profileImage,
        coverImage:   user.coverImage,
        paymentMethods: user.paymentMethods,
        guestId:      user.guestId,
      },
    });
  } catch (err) { next(err); }
});

// ── POST /api/auth/payment-methods ────────────────────────
router.post("/payment-methods", verifyCustomerToken, async (req, res, next) => {
  try {
    const { type, brand, last4, expiry, upiId, bankName, isDefault } = req.body;
    
    if (!type) return res.status(400).json({ success: false, message: "Type is required." });

    if (type === 'card' && (!brand || !last4 || !expiry)) {
      return res.status(400).json({ success: false, message: "Missing card details." });
    }
    if (type === 'upi' && !upiId) {
      return res.status(400).json({ success: false, message: "UPI ID is required." });
    }
    if (type === 'netbanking' && !bankName) {
      return res.status(400).json({ success: false, message: "Bank name is required." });
    }

    const user = await User.findById(req.customer.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found." });

    // If this is the first card or explicitly set as default, unset others
    if (isDefault || user.paymentMethods.length === 0) {
      user.paymentMethods.forEach(pm => pm.isDefault = false);
    }

    user.paymentMethods.push({
      type,
      brand,
      last4,
      expiry,
      upiId,
      bankName,
      isDefault: isDefault || user.paymentMethods.length === 0
    });

    await user.save();

    res.json({
      success: true,
      message: "Payment method added successfully.",
      data: user.paymentMethods,
    });
  } catch (err) { next(err); }
});

// ── GET /api/auth/bookings — fetch bookings for logged-in user ──
router.get("/bookings", verifyCustomerToken, async (req, res, next) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip  = (page - 1) * limit;

    // Use guestId from token to find bookings
    let guestId = req.customer.guestId;
    
    // If guestId is missing from token, try to find guest by email
    if (!guestId && req.customer.email) {
      const guest = await Guest.findOne({ email: req.customer.email.toLowerCase() });
      if (guest) {
        guestId = guest._id;
      }
    }
    
    if (!guestId) {
      return res.json({ success: true, count: 0, total: 0, page, pages: 0, data: [] });
    }

    const [bookings, total] = await Promise.all([
      Booking.find({ guest: guestId })
        .populate("room", "roomNumber type pricePerNight images hotelStringId")
        .populate("guest", "name email phone")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Booking.countDocuments({ guest: guestId }),
    ]);

    res.json({
      success: true,
      count:   bookings.length,
      total,
      page,
      pages:   Math.ceil(total / limit),
      data:    bookings,
    });
  } catch (err) { next(err); }
});

export default router;
