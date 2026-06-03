/**
 * managerAuth.js
 * ─────────────────────────────────────────────────────────
 * JWT middleware for multi-tenant hotel manager authentication.
 *
 * verifyManagerToken  — decodes JWT, attaches req.manager
 * isAssignedManager   — enforces hotel silo for Manager role
 * scopeToHotel        — injects req.scopedHotelId / req.scopedHotelName
 */

import jwt    from "jsonwebtoken";
import logger from "../utils/logger.js";
import Hotel  from "../models/Hotel.js";

const getSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    logger.error("JWT_SECRET is not set in environment variables");
    throw new Error("Server misconfiguration: JWT_SECRET missing");
  }
  return secret;
};

// ── verifyManagerToken ────────────────────────────────────
export const verifyManagerToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please sign in.",
      });
    }

    const token = authHeader.split(" ")[1];

    let decoded;
    try {
      decoded = jwt.verify(token, getSecret());
    } catch (err) {
      const message =
        err.name === "TokenExpiredError"
          ? "Session expired. Please sign in again."
          : "Invalid token. Please sign in again.";
      return res.status(401).json({ success: false, message });
    }

    const allowedRoles = ["manager", "admin", "super admin", "controller"];
    const userRole = decoded.role?.toLowerCase();
    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Access restricted to authorized staff roles.",
      });
    }

    req.manager = decoded;

    // ── Enforce first-login password change ───────────────
    // Allow only the change-password endpoint until password is updated
    if (decoded.mustChangePassword === true) {
      const isChangePasswordRoute = req.path === "/change-password";
      if (!isChangePasswordRoute) {
        return res.status(403).json({
          success: false,
          message: "Password change required. Please change your temporary password before accessing the dashboard.",
          code: "PASSWORD_CHANGE_REQUIRED",
        });
      }
    }

    next();
  } catch (error) {
    next(error);
  }
};

// ── isAssignedManager ─────────────────────────────────────
export const isAssignedManager = (req, res, next) => {
  const manager = req.manager;

  if (!manager || manager.role === "Super Admin" || manager.role === "Controller") {
    return next();
  }

  if (manager.role === "Manager") {
    const requestedHotelId =
      req.params.hotelId ||
      req.query.hotelId  ||
      req.body?.hotelId;

    if (!requestedHotelId) {
      req.scopedHotelId = manager.assignedHotelId;
      return next();
    }

    if (requestedHotelId !== manager.assignedHotelId) {
      logger.warn("Hotel access denied", {
        managerId: manager.id,
        assignedHotel: manager.assignedHotelId,
        requestedHotel: requestedHotelId,
        ip: req.ip,
      });
      return res.status(403).json({
        success: false,
        message: "Unauthorized: You do not have management access to this property.",
        code: "HOTEL_ACCESS_DENIED",
      });
    }

    req.scopedHotelId = manager.assignedHotelId;
    return next();
  }

  next();
};

// ── scopeToHotel ──────────────────────────────────────────
export const scopeToHotel = async (req, res, next) => {
  if (req.manager?.role === "Manager" && req.manager?.assignedHotelId) {
    req.scopedHotelId       = req.manager.assignedHotelId;
    req.scopedHotelName     = req.manager.assignedHotelName;
    req.scopedHotelObjectId = req.manager.hotelObjectId || null;

    if (!req.scopedHotelObjectId) {
      const hotel = await Hotel.findOne({ hotelId: req.manager.assignedHotelId }).select("_id").lean();
      if (hotel) req.scopedHotelObjectId = hotel._id;
    }
  }
  next();
};
