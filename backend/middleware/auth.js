import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/User.js";
import Booking from "../models/Booking.js";
import Room from "../models/Room.js";
import Hotel from "../models/Hotel.js";
import Guest from "../models/Guest.js";
import Notification from "../models/Notification.js";
import AuditLog from "../models/AuditLog.js";
import { getRedisClient, isRedisReady } from "../config/redis.js";
import logger from "../utils/logger.js";

const getSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    logger.error("JWT_SECRET is not set in environment variables");
    throw new Error("Server misconfiguration: JWT_SECRET missing");
  }
  return secret;
};

// ── Unified Authentication Middleware ────────────────────
export const protect = async (req, res, next) => {
  try {
    let token = null;
    const authHeader = req.headers.authorization;

    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: "Authentication required. Please sign in." });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, getSecret());
    } catch (err) {
      const message = err.name === "TokenExpiredError" ? "Session expired. Please sign in again." : "Invalid token. Please sign in again.";
      return res.status(401).json({ success: false, message });
    }

    // ── Access Token Blacklist Check ─────────────────
    if (decoded.jti && isRedisReady()) {
      try {
        const client = getRedisClient();
        const isBlacklisted = await client.get(`blacklist:${decoded.jti}`);
        if (isBlacklisted) return res.status(401).json({ success: false, message: "Session revoked. Please sign in again." });
      } catch (err) {}
    }

    const currentIp = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "127.0.0.1";
    const currentDevice = req.headers["user-agent"] || "unknown";

    if (decoded.ip && decoded.deviceFingerprint) {
      if (currentIp !== decoded.ip || currentDevice !== decoded.deviceFingerprint) {
        AuditLog.create({
          event: "IPAnomaly",
          userId: decoded.id,
          userEmail: decoded.email,
          role: decoded.role,
          ipAddress: currentIp,
          previousIp: decoded.ip,
          deviceFingerprint: currentDevice,
          previousDevice: decoded.deviceFingerprint,
          description: "Detected mismatched IP or Device from original JWT payload.",
          severity: "Medium"
        }).catch(() => {});
        // Strict enforcement: if IP fundamentally changes, require re-authentication
        // return res.status(401).json({ success: false, message: "Session anomaly detected. Please sign in again." });
      }
    }

    req.user = decoded;
    req.customer = decoded;
    req.manager = decoded;
    req.admin = decoded;

    next();
  } catch (error) { next(error); }
};

// ── Role-Based Access Control (RBAC) ─────────────────────
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    const userRole = req.user?.role;
    if (!userRole || !roles.map(r => r.toLowerCase()).includes(userRole.toLowerCase())) {
      return res.status(403).json({ success: false, message: "Forbidden: You do not have the required role to access this resource." });
    }
    next();
  };
};

// ── BOLA Protection: Validate Ownership ──────────────────
export const validateOwnership = (modelName) => {
  return async (req, res, next) => {
    try {
      const user = req.user;   // ← populated by protect() middleware
      const id   = req.params.id;

      if (!user) {
        return res.status(401).json({ success: false, message: "Authentication required." });
      }

      // Admins bypass ownership checks
      if (user.role === "Super Admin" || user.role === "admin" || user.role === "Controller") {
        return next();
      }

      const userId = user.id;
      const userEmail = user.email?.toLowerCase().trim();

      switch (modelName) {
        case "Booking": {
          if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid booking ID format." });
          }

          const booking = await Booking.findById(id);
          if (!booking) {
            return res.status(404).json({ success: false, message: "Booking not found." });
          }

          if (user.role === "Manager") {
            const managerHotelId = user.assignedHotelId;
            const managerHotelObjId = user.hotelObjectId;
            const bookingHotelStrId = booking.hotelStringId;
            const bookingHotelObjId = booking.hotelId?.toString();

            const isAuthorized = 
              (managerHotelId && bookingHotelStrId === managerHotelId) ||
              (managerHotelObjId && bookingHotelObjId === String(managerHotelObjId));

            if (!isAuthorized) {
              return res.status(403).json({
                success: false,
                message: "Unauthorized: You do not manage this hotel's bookings.",
              });
            }
          } else {
            // Customer checks
            const isGuestOwner = booking.guest?.toString() === user.guestId || 
                                 booking.guestSnapshot?.id === user.guestId ||
                                 booking.guestSnapshot?.email?.toLowerCase().trim() === userEmail;

            if (!isGuestOwner) {
              return res.status(403).json({
                success: false,
                message: "Unauthorized: You do not own this booking.",
              });
            }
          }
          break;
        }

        case "Hotel": {
          // Hotels can be requested via hotelId (string) or _id (ObjectId)
          let hotel = null;
          if (mongoose.Types.ObjectId.isValid(id)) {
            hotel = await Hotel.findById(id);
          }
          if (!hotel) {
            hotel = await Hotel.findOne({ hotelId: id });
          }

          if (!hotel) {
            return res.status(404).json({ success: false, message: "Hotel not found." });
          }

          // Customers can only perform GET (read) requests
          if (user.role === "customer") {
            if (req.method !== "GET") {
              return res.status(403).json({ success: false, message: "Unauthorized: Customers cannot modify hotel profiles." });
            }
          } else if (user.role === "Manager") {
            const managerHotelId = user.assignedHotelId;
            const managerHotelObjId = user.hotelObjectId;
            
            const isAuthorized = 
              hotel.hotelId === managerHotelId || 
              hotel._id.toString() === String(managerHotelObjId);

            if (!isAuthorized) {
              return res.status(403).json({
                success: false,
                message: "Unauthorized: You do not have management rights for this hotel.",
              });
            }
          } else {
            return res.status(403).json({ success: false, message: "Unauthorized role access." });
          }
          break;
        }

        case "Room": {
          if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid room ID format." });
          }

          const room = await Room.findById(id);
          if (!room) {
            return res.status(404).json({ success: false, message: "Room not found." });
          }

          if (user.role === "customer") {
            if (req.method !== "GET") {
              return res.status(403).json({ success: false, message: "Unauthorized: Customers cannot modify rooms." });
            }
          } else if (user.role === "Manager") {
            const managerHotelId = user.assignedHotelId;
            const managerHotelObjId = user.hotelObjectId;
            const roomHotelStrId = room.hotelStringId;
            const roomHotelObjId = room.hotelId?.toString();

            const isAuthorized = 
              (managerHotelId && roomHotelStrId === managerHotelId) ||
              (managerHotelObjId && roomHotelObjId === String(managerHotelObjId));

            if (!isAuthorized) {
              return res.status(403).json({
                success: false,
                message: "Unauthorized: You do not manage this room's hotel.",
              });
            }
          } else {
            return res.status(403).json({ success: false, message: "Unauthorized role access." });
          }
          break;
        }

        case "User": {
          if (userId !== id) {
            return res.status(403).json({
              success: false,
              message: "Unauthorized: You can only access your own profile.",
            });
          }
          break;
        }

        case "Guest": {
          if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid guest ID format." });
          }

          const guest = await Guest.findById(id).populate("bookings");
          if (!guest) {
            return res.status(404).json({ success: false, message: "Guest not found." });
          }

          if (user.role === "customer") {
            const isGuestOwner = guest.email?.toLowerCase().trim() === userEmail || guest._id.toString() === user.guestId;
            if (!isGuestOwner) {
              return res.status(403).json({
                success: false,
                message: "Unauthorized: Access denied to this guest profile.",
              });
            }
          } else if (user.role === "Manager") {
            const managerHotelId = user.assignedHotelId;
            const managerHotelObjId = user.hotelObjectId;
            const hasBookedHere = guest.bookings.some(b => 
              b.hotelStringId === managerHotelId || String(b.hotelId) === String(managerHotelObjId)
            );

            if (!hasBookedHere) {
              return res.status(403).json({
                success: false,
                message: "Unauthorized: Guest has no bookings at your assigned hotel.",
              });
            }
          } else {
            return res.status(403).json({ success: false, message: "Unauthorized role access." });
          }
          break;
        }

        case "Notification": {
          if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "Invalid notification ID format." });
          }

          const notification = await Notification.findById(id);
          if (!notification) {
            return res.status(404).json({ success: false, message: "Notification not found." });
          }

          if (user.role === "Manager") {
            if (notification.hotelId !== user.assignedHotelId) {
              return res.status(403).json({
                success: false,
                message: "Unauthorized: You do not have access to this notification.",
              });
            }
          } else if (user.role === "customer") {
            if (notification.userId !== user.id) {
              return res.status(403).json({
                success: false,
                message: "Unauthorized: You do not own this notification.",
              });
            }
          } else {
            return res.status(403).json({ success: false, message: "Unauthorized role access." });
          }
          break;
        }

        default:
          return res.status(500).json({ success: false, message: "Invalid authorization scope model." });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// ── ObjectId Validation Guard ─────────────────────────────
// Prevents CastError leakage and protects against malformed
// BOLA/IDOR attempts via crafted non-ObjectId identifiers.
// Apply BEFORE any findById / route that uses req.params.id.
export const requireObjectId = (paramName = "id") => {
  return (req, res, next) => {
    const id = req.params[paramName];
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${paramName} format. Must be a valid resource identifier.`,
      });
    }
    next();
  };
};

// ── Alias: requireRoles — cleaner name for inline use ─────
export const requireRoles = authorizeRoles;
