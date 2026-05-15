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
import User    from "../models/User.js";
import Guest   from "../models/Guest.js";
import Booking from "../models/Booking.js";
import { authLimiter } from "../middleware/rateLimiter.js";
import logger  from "../utils/logger.js";

import { OAuth2Client } from "google-auth-library";
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const router = express.Router();

const getSecret  = () => {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET missing");
  return s;
};
const JWT_EXPIRES = "7d";

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
      const guest = await Guest.findOne({ email: normalEmail });
      if (guest) {
        user.guestId = guest._id;
        await user.save();
      }
    }

    const token = jwt.sign(
      { id: user._id, guestId: user.guestId, email: user.email, name: user.name, role: "customer" },
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
      user = await User.create({
        name,
        email,
        passwordHash: await bcrypt.hash(Math.random().toString(36), 10), // Random password
        phone: "",
        profileImage: picture || "",
      });
      logger.info({ email, name }, "New Google user registered");
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, name: user.name, role: "customer" },
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
    const guestId = req.customer.guestId;
    if (!guestId) {
      return res.json({ success: true, count: 0, total: 0, page, pages: 0, data: [] });
    }

    const [bookings, total] = await Promise.all([
      Booking.find({ guest: guestId })
        .populate("room", "roomNumber type pricePerNight images hotelStringId")
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
