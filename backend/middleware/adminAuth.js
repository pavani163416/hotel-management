/**
 * adminAuth.js
 * ─────────────────────────────────────────────────────────
 * JWT-based authentication middleware for the Super Admin panel.
 * Replaces the insecure base64 token approach.
 *
 * verifyAdminToken  — validates Bearer JWT, attaches req.admin
 * requireAdmin      — ensures role is "Super Admin"
 */

import jwt from "jsonwebtoken";
import logger from "../utils/logger.js";

const getSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    logger.error("JWT_SECRET is not set in environment variables");
    throw new Error("Server misconfiguration: JWT_SECRET missing");
  }
  return secret;
};

// ── verifyAdminToken ──────────────────────────────────────
export const verifyAdminToken = (req, res, next) => {
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

    if (decoded.role === "customer") {
      return res.status(403).json({ success: false, message: "Access denied. Admin privileges required." });
    }

    req.admin = decoded;
    next();
  } catch (error) {
    next(error);
  }
};

// ── requireAdmin ──────────────────────────────────────────
export const requireAdmin = (req, res, next) => {
  if (!req.admin || req.admin.role !== "Super Admin") {
    logger.warn("Unauthorized admin access attempt", {
      ip: req.ip,
      path: req.originalUrl,
      role: req.admin?.role,
    });
    return res.status(403).json({
      success: false,
      message: "Access denied. Super Admin privileges required.",
    });
  }
  next();
};
