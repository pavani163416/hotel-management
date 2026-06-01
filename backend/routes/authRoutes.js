/**
 * @swagger
 * tags:
 *   - name: Auth
 *     description: Customer authentication and profile endpoints
 * /api/auth/register:
 *   post:
 *     summary: Register a new customer and create a guest profile
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthRegister'
 *     responses:
 *       201:
 *         description: Account created successfully
 *       400:
 *         description: Invalid registration payload
 * /api/auth/login:
 *   post:
 *     summary: Authenticate a customer and return a JWT
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AuthLogin'
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request a password reset email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Password reset email sent
 * /api/auth/reset-password:
 *   post:
 *     summary: Complete password reset using token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PasswordReset'
 *     responses:
 *       200:
 *         description: Password updated
 * /api/auth/phone/send:
 *   post:
 *     summary: Send phone verification OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PhoneVerify'
 *     responses:
 *       200:
 *         description: OTP sent
 * /api/auth/phone/verify:
 *   post:
 *     summary: Verify phone OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PhoneVerify'
 *     responses:
 *       200:
 *         description: Phone verified
 * /api/auth/google:
 *   post:
 *     summary: Sign in or register using Google OAuth token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               idToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Google authentication successful
 * /api/auth/me:
 *   get:
 *     summary: Get currently authenticated user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile returned
 * /api/auth/profile:
 *   patch:
 *     summary: Update profile information for the authenticated user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *               city:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 * /api/auth/change-password:
 *   post:
 *     summary: Change password for authenticated user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currentPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       200:
 *         description: Password changed successfully
 * /api/auth/payment-methods:
 *   post:
 *     summary: Save a customer payment method (stubbed endpoint)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               paymentToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Payment method saved
 * /api/auth/bookings:
 *   get:
 *     summary: Get bookings for authenticated customer
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bookings list returned
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
import { authLimiter, loginLimiter, otpRateLimiter } from "../middleware/rateLimiter.js";
import logger  from "../utils/logger.js";
import { sendPasswordResetEmail, sendOtpEmail } from "../utils/emailService.js";
import { cacheGet, cacheSet, cacheDel } from "../cache/redisCache.js";
import { getRedisClient, isRedisReady } from "../config/redis.js";
import { enqueueEmailJob } from "../queues/emailQueue.js";
import AuditLog from "../models/AuditLog.js";
import { 
  validateLoginPayload, 
  validateRegisterPayload, 
  validateEmailPayload, 
  validateResetPasswordPayload 
} from "../middleware/authValidator.js";

import { OAuth2Client } from "google-auth-library";
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const router = express.Router();

// Local fallback for tracking user refresh tokens (if Redis is down)
const localUserRefreshTokens = new Map();

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
  if (!phone) {
    throw new Error("Phone number is required.");
  }

  // Reject URLs/SSRF or any script/HTML payloads immediately
  if (phone.includes("http://") || phone.includes("https://") || phone.includes("<") || phone.includes(">")) {
    throw new Error("Invalid phone number format.");
  }

  const normalized = phone.trim().replace(/[\s()\-]/g, "");

  // Strict E.164 phone validation (starts with +, followed by 1-9, and 7 to 14 digits)
  const e164Regex = /^\+[1-9]\d{7,14}$/;
  if (!e164Regex.test(normalized)) {
    throw new Error("Phone number must be a valid E.164 number starting with + and contain 8 to 15 digits.");
  }

  // Reject premium-rate phone numbers
  const premiumRatePatterns = [
    /^\+449[0-8]/, // UK premium rate
    /^\+4470/,     // UK personal numbers (often abused/premium)
    /^\+1900/,     // US premium rate
    /^\+881/,      // Global Mobile Satellite System
    /^\+882/,      // International Networks
    /^\+888/,      // Disaster Relief
  ];

  for (const pattern of premiumRatePatterns) {
    if (pattern.test(normalized)) {
      throw new Error("Premium-rate numbers are not allowed.");
    }
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
    const decoded = jwt.verify(header.split(" ")[1], getSecret());
    if (decoded.role !== "customer") {
      return res.status(403).json({ success: false, message: "Access forbidden: customer role required." });
    }
    req.customer = decoded;
    next();
  } catch (err) {
    const msg = err.name === "TokenExpiredError"
      ? "Session expired. Please sign in again."
      : "Invalid token.";
    return res.status(401).json({ success: false, message: msg });
  }
};

// ── POST /api/auth/register ───────────────────────────────
router.post("/register", authLimiter, validateRegisterPayload, async (req, res, next) => {
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
    let user = await User.findOne({ email: normalEmail });
    if (user) {
      if (user.isVerified) {
        return res.status(409).json({
          success: false,
          message: "An account with this email already exists. Please sign in.",
        });
      } else {
        // User exists but unverified. Re-send email first before saving updates.
        const otp = crypto.randomBytes(3).toString("hex").toUpperCase();
        const otpEmailPayload = { to: normalEmail, name: name.trim(), otp };

        try {
          await sendOtpEmail(otpEmailPayload);
        } catch (emailErr) {
          return res.status(500).json({ success: false, message: "Failed to send verification email. Please check your email address and try again." });
        }

        user.passwordHash = await bcrypt.hash(password, 12);
        user.name = name.trim();
        user.phone = phone.trim();
        user.city = city?.trim() || "";
        user.verificationAttempts = (user.verificationAttempts || 0) + 1;
        user.verificationSentAt = new Date();
        await user.save();
        
        // Update Guest record
        if (user.guestId) {
          await Guest.findByIdAndUpdate(user.guestId, {
            name: name.trim(),
            phone: phone.trim(),
            city: city?.trim() || "",
          });
        }

        await cacheSet(`otp_${normalEmail}`, otp, 300);
        await cacheSet(`cooldown_${normalEmail}`, "true", 60);

        return res.status(201).json({
          success: true,
          message: "Your account is pending verification. A verification code has been sent to your email.",
          data: {
            email: user.email,
            isVerified: false,
          },
        });
      }
    }

    const otp = crypto.randomBytes(3).toString("hex").toUpperCase();
    const otpEmailPayload = { to: normalEmail, name: name.trim(), otp };

    // Attempt email send first
    try {
      await sendOtpEmail(otpEmailPayload);
    } catch (emailErr) {
      return res.status(500).json({ success: false, message: "Failed to send verification email. Please check your email address and try again." });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // ── Create User record (credentials) ─────────────
    user = await User.create({
      name:         name.trim(),
      email:        normalEmail,
      passwordHash,
      phone:        phone.trim(),
      city:         city?.trim() || "",
      isVerified:   false
    });

    // ── Upsert Guest record (booking profile) ─────────
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
    user.verificationAttempts = 1;
    user.verificationSentAt = new Date();
    await user.save();

    await cacheSet(`otp_${normalEmail}`, otp, 300);
    await cacheSet(`cooldown_${normalEmail}`, "true", 60);

    // DEVELOPMENT AID: Log the OTP so you can see it in the terminal
    console.log(`\n=========================================`);
    console.log(`🔑 DEV: Verification Code for ${normalEmail}: ${otp}`);
    console.log(`=========================================\n`);

    logger.info("Customer registered (unverified)", { email: normalEmail });

    return res.status(201).json({
      success: true,
      message: "Registration successful. A 6-digit verification code has been sent to your email.",
      otp: otp,
      data: {
        email: user.email,
        isVerified: false,
      },
    });
  } catch (err) { next(err); }
});

// ── POST /api/auth/forgot-password ─────────────────────────
router.post("/forgot-password", authLimiter, validateEmailPayload, async (req, res, next) => {
  try {
    const email = (req.body.email || "").toLowerCase().trim();
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required." });
    }

    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
    const [manager, AdminModel, customer] = await Promise.all([
      Manager.findOne({ email, isActive: true }),
      getAdminUserModel(),
      User.findOne({ email, isActive: true }),
    ]);

    const adminUser = AdminModel ? await AdminModel.findOne({ email, isActive: true }) : null;

    if (manager || adminUser || customer) {
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
      if (customer) {
        customer.resetPasswordToken = hashedToken;
        customer.resetPasswordExpires = expires;
        await customer.save();
      }

      await sendPasswordResetEmail({
        to: email,
        name: manager?.name || adminUser?.name || customer?.name || "LuxeStay User",
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
router.post("/reset-password", authLimiter, validateResetPasswordPayload, async (req, res, next) => {
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

    const [manager, AdminModel, customer] = await Promise.all([
      Manager.findOne({ email: email.toLowerCase().trim(), resetPasswordToken: hashedToken, resetPasswordExpires: { $gt: now } }),
      getAdminUserModel(),
      User.findOne({ email: email.toLowerCase().trim(), resetPasswordToken: hashedToken, resetPasswordExpires: { $gt: now } }),
    ]);
    const adminUser = AdminModel ? await AdminModel.findOne({ email: email.toLowerCase().trim(), resetPasswordToken: hashedToken, resetPasswordExpires: { $gt: now } }) : null;

    if (!manager && !adminUser && !customer) {
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
    if (customer) {
      customer.passwordHash = passwordHash;
      customer.resetPasswordToken = null;
      customer.resetPasswordExpires = null;
      await customer.save();
    }

    return res.status(200).json({ success: true, message: "Password has been reset. Please sign in with your new password." });
  } catch (error) {
    next(error);
  }
});

// ── POST /api/auth/login ──────────────────────────────────
router.post("/login", loginLimiter, validateLoginPayload, async (req, res, next) => {
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

    const DUMMY_HASH = "$2b$12$abcdefghijklmnopqrstuvwxyz12345678901234567890";
    if (!user || !user.passwordHash || !user.isActive) {
      await bcrypt.compare(password, DUMMY_HASH);
      if (user && !user.isActive) {
        return res.status(403).json({ success: false, message: "Account is disabled. Please contact support." });
      }
      return res.status(401).json({ success: false, message: "Invalid credentials." });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      logger.warn("Failed customer login", { email: normalEmail, ip: req.ip });
      return res.status(401).json({ success: false, message: "Invalid credentials." });
    }

    if (!user.isVerified) {
      // Avoid spamming resends on every single login attempt, use cooldown
      const cooldown = await cacheGet(`cooldown_${normalEmail}`);
      let activeOtp;
      if (!cooldown) {
        const otp = crypto.randomInt(100000, 1000000).toString();
        await cacheSet(`otp_${normalEmail}`, otp, 300);
        await cacheSet(`cooldown_${normalEmail}`, "true", 60);
  
        user.verificationAttempts = (user.verificationAttempts || 0) + 1;
        user.verificationSentAt = new Date();
        await user.save();

        const otpEmailPayload = { to: normalEmail, name: user.name, otp };
        
        try {
          await sendOtpEmail(otpEmailPayload);
        } catch (emailErr) {
          return res.status(500).json({ success: false, message: "Failed to send verification email. Please try again later." });
        }
        activeOtp = otp;
      } else {
        activeOtp = await cacheGet(`otp_${normalEmail}`);
      }

      // DEVELOPMENT AID: Log the OTP so you can see it in the terminal
      console.log(`\n=========================================`);
      console.log(`🔑 DEV: Verification Code for ${normalEmail}: ${activeOtp}`);
      console.log(`=========================================\n`);

      return res.status(403).json({
        success: false,
        requiresVerification: true,
        message: "Your account is pending verification. Please verify your email to continue.",
        code: "UNVERIFIED_EMAIL",
        email: normalEmail,
        otp: activeOtp
      });
    }

    // Update last login timestamp
    user.lastLogin = new Date();
    await user.save();

    // Ensure guest record is linked and actually exists
    let guestIdValid = false;
    if (user.guestId) {
      const guestExists = await Guest.findById(user.guestId);
      if (guestExists) {
        guestIdValid = true;
      } else {
        user.guestId = undefined; // Reset stale guestId
        await user.save();
      }
    }

    if (!user.guestId || !guestIdValid) {
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

    // ── Generate Fingerprint & Audit ───────────────
    const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "127.0.0.1";
    const deviceFingerprint = req.headers["user-agent"] || "unknown";
    const jti = crypto.randomUUID();

    AuditLog.create({
      event: "LoginSuccess",
      userId: user._id,
      userEmail: user.email,
      role: "customer",
      ipAddress: ip,
      deviceFingerprint,
      description: "Customer local login successful",
    }).catch(err => logger.error("AuditLog error:", err));

    // Issue tokens
    const accessToken = jwt.sign(
      { 
        id: user._id, 
        guestId: user.guestId?.toString() || user.guestId, 
        email: user.email, 
        name: user.name, 
        role: "customer",
        jti,
        ip,
        deviceFingerprint
      },
      getSecret(),
      { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
      { id: user._id, role: "customer" },
      getSecret(),
      { expiresIn: "7d" }
    );

    // Save refresh token in Redis session store
    await cacheSet(`refresh_token:${refreshToken}`, { userId: user._id.toString(), role: "customer" }, 7 * 24 * 3600);

    // Add to user's set of active refresh tokens (Redis or local fallback)
    if (isRedisReady()) {
      try {
        const client = getRedisClient();
        if (client) {
          await client.sadd(`user_refresh_tokens:${user._id.toString()}`, refreshToken);
        }
      } catch (e) {
        logger.warn("Failed to add refresh token to user set in Redis", { userId: user._id, error: e.message });
      }
    } else {
      let set = localUserRefreshTokens.get(user._id.toString());
      if (!set) {
        set = new Set();
        localUserRefreshTokens.set(user._id.toString(), set);
      }
      set.add(refreshToken);
    }

    // Set refresh token in secure HttpOnly cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    logger.info("Customer login successful", { email: normalEmail });

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
        token: accessToken,
        refreshToken
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
    try {
      await sendTwilioVerification(normalizedPhone);
      return res.status(200).json({ success: true, message: "OTP sent successfully." });
    } catch (twilioErr) {
      logger.warn(`Twilio verify fail, generating mock OTP: ${twilioErr.message}`);
      const mockCode = crypto.randomInt(100000, 1000000).toString();
      await cacheSet(`mock_phone_otp_${normalizedPhone}`, mockCode, 300);

      console.log(`\n=========================================`);
      console.log(`🔑 DEV: Phone Verification OTP for ${normalizedPhone}: ${mockCode}`);
      console.log(`=========================================\n`);

      return res.status(200).json({
        success: true,
        message: "OTP sent successfully (development fallback).",
        otp: mockCode
      });
    }
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
    
    // Check if there is a dev mock OTP
    const mockCode = await cacheGet(`mock_phone_otp_${normalizedPhone}`);
    let isApproved = false;

    if (mockCode && mockCode === code) {
      isApproved = true;
      await cacheDel(`mock_phone_otp_${normalizedPhone}`);
    } else {
      const verification = await verifyTwilioCode(normalizedPhone, code);
      if (verification.status === "approved") {
        isApproved = true;
      }
    }

    if (!isApproved) {
      return res.status(401).json({ success: false, message: "OTP verification failed." });
    }

    let user = await User.findOne({ phone: normalizedPhone }).select("+passwordHash");
    if (!user) {
      const safePhone = normalizedPhone.replace(/\D/g, "") || "unknown";
      const generatedEmail = `${safePhone || "no-phone"}@phone.luxe`;
      const generatedName = `Guest ${safePhone.slice(-4) || safePhone}`;
      const passwordHash = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 12);

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

    let email, name, picture, googleId;

    const isJWT = idToken.split('.').length === 3;

    if (!isJWT) {
      // It's a Google Access Token (implicit flow on Web)
      const response = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${idToken}`);
      if (!response.ok) {
        throw new Error("Failed to verify Google access token");
      }
      const userInfo = await response.json();
      email = userInfo.email;
      name = userInfo.name;
      picture = userInfo.picture;
      googleId = userInfo.sub;
    } else {
      // It's an ID Token (JWT) (used on mobile devices)
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: [
          process.env.GOOGLE_CLIENT_ID,
          "239513848879-3d319eb0dp07rltmkhelp6qtqp4rhhpq.apps.googleusercontent.com", // Production signed Android
          "239513848879-9f7e5ju597pgbl7p4isddckui4misecp.apps.googleusercontent.com", // Debug Android
        ],
      });
      const payload = ticket.getPayload();
      email = payload.email;
      name = payload.name;
      picture = payload.picture;
      googleId = payload.sub;
    }

    let user = await User.findOne({ email });

    if (!user) {
      // Create User
      user = await User.create({
        name,
        email,
        passwordHash: await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10),
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
    logger.error(err, "Google Auth Error");
    res.status(401).json({ success: false, message: `Invalid Google Token: ${err.message}`, debug: err.stack, tokenReceived: req.body.idToken ? req.body.idToken.substring(0, 15) + '...' : 'none' });
  }
});

let firebasePublicKeys = null;
let keysExpiry = 0;

async function getFirebasePublicKeys() {
  if (firebasePublicKeys && Date.now() < keysExpiry) {
    return firebasePublicKeys;
  }
  const res = await fetch("https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com");
  const data = await res.json();
  firebasePublicKeys = data;
  keysExpiry = Date.now() + 3600000;
  return firebasePublicKeys;
}

async function verifyFirebaseIdToken(idToken) {
  const decoded = jwt.decode(idToken, { complete: true });
  if (!decoded || !decoded.header || !decoded.header.kid) {
    throw new Error("Invalid token format");
  }
  const publicKeys = await getFirebasePublicKeys();
  const cert = publicKeys[decoded.header.kid];
  if (!cert) {
    throw new Error("Invalid token signature key");
  }
  const projectId = "hotel-mgnt-8ffff";
  const payload = jwt.verify(idToken, cert, {
    algorithms: ["RS256"],
    audience: projectId,
    issuer: `https://securetoken.google.com/${projectId}`,
  });
  return payload;
}

// ── POST /api/auth/firebase ────────────────────────────────
router.post("/firebase", async (req, res, next) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ success: false, message: "ID Token is required" });

    const payload = await verifyFirebaseIdToken(idToken);
    const phone = payload.phone_number || req.body.phone || "";
    let email = payload.email || req.body.email || "";

    if (!email) {
      if (phone) {
        // Construct a virtual unique email for phone authentication
        email = `phone_${phone.replace(/[^0-9]/g, "")}@phone.luxestay.com`;
      } else {
        return res.status(400).json({ success: false, message: "Firebase token must contain email or phone number" });
      }
    }

    const name = payload.name || req.body.name || (phone ? `Guest ${phone}` : email.split("@")[0]);
    const picture = payload.picture || "";

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        name,
        email,
        passwordHash: await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10),
        phone: phone,
        profileImage: picture,
        isVerified: true,
      });

      const guest = await Guest.create({
        name,
        email,
        phone: phone,
        profileImage: picture,
      });

      user.guestId = guest._id;
      await user.save();
      logger.info({ email, name, phone }, "New Firebase user registered");
    } else {
      let updated = false;
      if (!user.isVerified) {
        user.isVerified = true;
        updated = true;
      }
      if (phone && !user.phone) {
        user.phone = phone;
        updated = true;
      }
      if (updated) {
        await user.save();
      }
    }

    const token = jwt.sign(
      { id: user._id, guestId: user.guestId, email: user.email, name: user.name, role: "customer" },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        city: user.city,
        profileImage: user.profileImage,
        coverImage: user.coverImage,
        paymentMethods: user.paymentMethods,
        token,
      },
    });
  } catch (err) {
    logger.error(err, "Firebase Auth Error");
    res.status(401).json({ success: false, message: `Invalid Firebase Token: ${err.message}` });
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

    if (name) {
      const err = checkXss(name, "name");
      if (err) return res.status(400).json({ success: false, message: err });
      user.name = sanitize(name.trim());
    }

    if (phone) {
      try {
        user.phone = normalizePhoneNumber(phone);
      } catch (err) {
        return res.status(400).json({ success: false, message: err.message });
      }
    }

    if (city) {
      const err = checkXss(city, "city");
      if (err) return res.status(400).json({ success: false, message: err });
      user.city = sanitize(city.trim());
    }

    if (profileImage !== undefined) user.profileImage = profileImage;
    if (coverImage !== undefined) user.coverImage = coverImage;

    console.log(`[ProfileUpdate] Saving user ${user.email}: profile=${profileImage}, cover=${coverImage}`);
    await user.save();

    // Sync with Guest record if exists
    if (user.guestId) {
      const guest = await Guest.findById(user.guestId);
      if (guest) {
        if (name) guest.name = user.name;
        if (phone) guest.phone = user.phone;
        if (city) guest.city = user.city;
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

// ── POST /api/auth/change-password ─────────────────────────
router.post("/change-password", verifyCustomerToken, async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Old password and new password are required.",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 8 characters long.",
      });
    }

    if (newPassword.length > 72 || oldPassword.length > 72) {
      return res.status(400).json({
        success: false,
        message: "Password must be at most 72 characters long.",
      });
    }

    if (!/[A-Z]/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: "New password must contain at least one uppercase letter.",
      });
    }

    if (!/[!@#$%^&*(),.?\":{}|<>]/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: "New password must contain at least one special character.",
      });
    }

    const user = await User.findById(req.customer.id).select("+passwordHash");
    if (!user || !user.passwordHash) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const valid = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!valid) {
      return res.status(400).json({ success: false, message: "Incorrect old password." });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();

    logger.info("Customer changed password", { email: user.email });

    return res.status(200).json({
      success: true,
      message: "Password updated successfully.",
    });
  } catch (err) { next(err); }
});

// ── POST /api/auth/payment-methods ────────────────────────
router.post("/payment-methods", verifyCustomerToken, async (req, res, next) => {
  try {
    const { type, brand, last4, expiry, upiId, bankName, isDefault } = req.body;
    
    if (!type) return res.status(400).json({ success: false, message: "Type is required." });

    if ((type === 'card' || type === 'credit') && (!brand || !last4 || !expiry)) {
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

    // We want to fetch all bookings associated with this user's email across both website and app!
    const userEmail = req.customer.email ? req.customer.email.toLowerCase().trim() : "";
    
    let guestIds = [];
    if (userEmail) {
      const matchingGuests = await Guest.find({ email: userEmail });
      guestIds = matchingGuests.map(g => g._id);
    }
    
    if (req.customer.guestId && mongoose.Types.ObjectId.isValid(req.customer.guestId)) {
      const tokenGuestId = new mongoose.Types.ObjectId(req.customer.guestId);
      if (!guestIds.some(id => id.equals(tokenGuestId))) {
        guestIds.push(tokenGuestId);
      }
    }

    if (guestIds.length === 0) {
      return res.json({ success: true, count: 0, total: 0, page, pages: 0, data: [] });
    }

    const filter = {
      $or: [
        { guest: { $in: guestIds } },
        { "guestSnapshot.email": userEmail }
      ]
    };

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate("room", "roomNumber type pricePerNight images hotelStringId")
        .populate("guest", "name email phone")
        .populate("hotelId", "image")
        .sort({ createdAt: -1 }),
      Booking.countDocuments(filter),
    ]);

    const data = bookings.map((b) => ({
      ...b.toJSON(),
      hotelImage: b.hotelImage || b.room?.images?.[0] || b.hotelId?.image || "",
    }));

    res.json({
      success: true,
      count:   data.length,
      total,
      page,
      pages:   Math.ceil(total / limit),
      data,
    });
  } catch (err) { next(err); }
});

// ── POST /api/auth/verify-otp ─────────────────────────────
router.post("/verify-otp", otpRateLimiter, async (req, res, next) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ success: false, message: "Email and OTP code are required." });
    }

    const normalEmail = email.toLowerCase().trim();
    const storedOtp = await cacheGet(`otp_${normalEmail}`);

    if (!storedOtp || storedOtp !== code.trim()) {
      return res.status(400).json({ success: false, message: "Invalid or expired verification code." });
    }

    // Set user as verified
    const user = await User.findOne({ email: normalEmail });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    user.isVerified = true;
    user.accountStatus = "active";
    await user.save();

    // Delete OTP
    await cacheDel(`otp_${normalEmail}`);

    // Generate tokens
    const accessToken = jwt.sign(
      { id: user._id, guestId: user.guestId?.toString() || user.guestId, email: user.email, name: user.name, role: "customer" },
      getSecret(),
      { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
      { id: user._id, role: "customer" },
      getSecret(),
      { expiresIn: "7d" }
    );

    // Save refresh token in Redis session store
    await cacheSet(`refresh_token:${refreshToken}`, { userId: user._id.toString(), role: "customer" }, 7 * 24 * 3600);

    // Add to user's set of active refresh tokens (Redis or local fallback)
    if (isRedisReady()) {
      try {
        const client = getRedisClient();
        if (client) {
          await client.sadd(`user_refresh_tokens:${user._id.toString()}`, refreshToken);
        }
      } catch (e) {
        logger.warn("Failed to add refresh token to user set in Redis on verification", { userId: user._id, error: e.message });
      }
    } else {
      let set = localUserRefreshTokens.get(user._id.toString());
      if (!set) {
        set = new Set();
        localUserRefreshTokens.set(user._id.toString(), set);
      }
      set.add(refreshToken);
    }

    // Set refresh token cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    logger.info("Email verified successfully", { email: normalEmail });

    return res.status(200).json({
      success: true,
      message: "Email verified successfully.",
      data: {
        id:    user._id,
        name:  user.name,
        email: user.email,
        phone: user.phone,
        city:  user.city,
        profileImage: user.profileImage,
        coverImage:   user.coverImage,
        paymentMethods: user.paymentMethods,
        token: accessToken,
        refreshToken
      },
    });
  } catch (err) { next(err); }
});

// ── POST /api/auth/resend-otp ─────────────────────────────
router.post("/resend-otp", otpRateLimiter, async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required." });
    }

    const normalEmail = email.toLowerCase().trim();

    // Check cooldown
    const cooldown = await cacheGet(`cooldown_${normalEmail}`);
    if (cooldown) {
      return res.status(429).json({
        success: false,
        message: "Please wait 1 minute before requesting another verification code."
      });
    }

    const user = await User.findOne({ email: normalEmail });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    if (user.isVerified) {
      return res.status(400).json({ success: false, message: "Email is already verified." });
    }

    // Generate new OTP and set cooldown
    const otp = crypto.randomInt(100000, 1000000).toString();
    await cacheSet(`otp_${normalEmail}`, otp, 300);
    await cacheSet(`cooldown_${normalEmail}`, "true", 60);

    const otpEmailPayload = { to: normalEmail, name: user.name, otp };
    try {
      await sendOtpEmail(otpEmailPayload);
    } catch (emailErr) {
      return res.status(500).json({ success: false, message: "Failed to send verification email. Please try again later." });
    }

    logger.info("Verification code resent", { email: normalEmail });

    return res.status(200).json({
      success: true,
      message: "A new verification code has been sent to your email.",
      otp: otp
    });
  } catch (err) { next(err); }
});

// ── POST /api/auth/refresh-token ──────────────────────────
router.post("/refresh-token", async (req, res, next) => {
  try {
    let token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!token) {
      return res.status(401).json({ success: false, message: "Refresh token is required." });
    }

    let payload;
    try {
      payload = jwt.verify(token, getSecret());
    } catch (e) {
      return res.status(401).json({ success: false, message: "Invalid or expired refresh token." });
    }

    // Check if the refresh token exists in Redis/session storage
    const sessionData = await cacheGet(`refresh_token:${token}`);
    if (!sessionData) {
      return res.status(401).json({ success: false, message: "Session expired or refresh token revoked." });
    }

    const userId = sessionData.userId;
    const user = await User.findById(userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: "User not found or account is deactivated." });
    }

    // Rotate: Issue new access token and new refresh token
    const newAccessToken = jwt.sign(
      { id: user._id, guestId: user.guestId?.toString() || user.guestId, email: user.email, name: user.name, role: user.role || "customer" },
      getSecret(),
      { expiresIn: "15m" }
    );

    const newRefreshToken = jwt.sign(
      { id: user._id, role: user.role || "customer" },
      getSecret(),
      { expiresIn: "7d" }
    );

    // Delete old refresh token from Redis
    await cacheDel(`refresh_token:${token}`);

    // Save new refresh token in Redis
    await cacheSet(`refresh_token:${newRefreshToken}`, { userId: user._id.toString(), role: user.role || "customer" }, 7 * 24 * 3600);

    // Update the set of active refresh tokens for this user
    if (isRedisReady()) {
      try {
        const client = getRedisClient();
        if (client) {
          await client.srem(`user_refresh_tokens:${user._id.toString()}`, token);
          await client.sadd(`user_refresh_tokens:${user._id.toString()}`, newRefreshToken);
        }
      } catch (e) {
        logger.warn("Failed to update refresh token set in Redis during rotation", { userId: user._id, error: e.message });
      }
    } else {
      let set = localUserRefreshTokens.get(user._id.toString());
      if (set) {
        set.delete(token);
        set.add(newRefreshToken);
      }
    }

    // Set new refresh token cookie
    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    return res.status(200).json({
      success: true,
      data: {
        token: newAccessToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (err) { next(err); }
});

// ── POST /api/auth/logout ─────────────────────────────────
router.post("/logout", async (req, res, next) => {
  try {
    const token = req.cookies?.refreshToken || req.body?.refreshToken;
    if (token) {
      // Invalidate in Redis
      await cacheDel(`refresh_token:${token}`);

      // Verify and remove from user set (best-effort)
      try {
        const payload = jwt.verify(token, getSecret());
        userId = payload.id;
        if (userId) {
          if (isRedisReady()) {
            const client = getRedisClient();
            if (client) {
              await client.srem(`user_refresh_tokens:${userId.toString()}`, token);
            }
          } else {
            const set = localUserRefreshTokens.get(userId.toString());
            if (set) {
              set.delete(token);
            }
          }
        }
      } catch (e) {}
    }

    // ── Access Token Blacklist ───────────────
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const accessToken = authHeader.split(" ")[1];
      try {
        const decoded = jwt.decode(accessToken);
        if (decoded && decoded.jti && isRedisReady()) {
          const client = getRedisClient();
          const exp = decoded.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 900;
          if (exp > 0) {
            await client.set(`blacklist:${decoded.jti}`, "true", "EX", exp);
          }
        }
      } catch (e) {}
    }

    // Clear cookie
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict"
    });

    return res.status(200).json({ success: true, message: "Logged out successfully." });
  } catch (err) { next(err); }
});

// ── POST /api/auth/logout-all ─────────────────────────────
router.post("/logout-all", verifyCustomerToken, async (req, res, next) => {
  try {
    const userId = req.customer.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }

    // Invalidate all active refresh tokens for the user in Redis/local fallback
    if (isRedisReady()) {
      try {
        const client = getRedisClient();
        if (client) {
          const userTokensKey = `user_refresh_tokens:${userId.toString()}`;
          const tokens = await client.smembers(userTokensKey);
          if (tokens && tokens.length > 0) {
            const deleteKeys = tokens.map(token => `refresh_token:${token}`);
            await client.del(...deleteKeys);
          }
          await client.del(userTokensKey);
        }
      } catch (e) {
        logger.warn("Failed to delete all refresh tokens in Redis for user logout-all", { userId, error: e.message });
      }
    } else {
      const set = localUserRefreshTokens.get(userId.toString());
      if (set) {
        for (const token of set) {
          await cacheDel(`refresh_token:${token}`);
        }
        localUserRefreshTokens.delete(userId.toString());
      }
    }

    // ── Access Token Blacklist ───────────────
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const accessToken = authHeader.split(" ")[1];
      try {
        const decoded = jwt.decode(accessToken);
        if (decoded && decoded.jti && isRedisReady()) {
          const client = getRedisClient();
          const exp = decoded.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 900;
          if (exp > 0) {
            await client.set(`blacklist:${decoded.jti}`, "true", "EX", exp);
          }
        }
      } catch (e) {}
    }

    AuditLog.create({
      event: "LogoutAllDevices",
      userId: userId,
      role: "customer",
      description: "User forcefully logged out all devices",
      severity: "Medium"
    }).catch(err => logger.error("AuditLog error:", err));

    // Clear cookie
    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict"
    });

    return res.status(200).json({ success: true, message: "Logged out from all devices successfully." });
  } catch (err) { next(err); }
});

export default router;
