/**
 * errorHandler.js — Global Error Handler Middleware (GLB-004 hardened)
 * Must be registered LAST in Express (after all routes).
 * Never exposes stack traces, internal error names, or raw messages in production.
 */

import logger from "../utils/logger.js";

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message    = err.message    || "Internal Server Error";

  // ── Mongoose: bad ObjectId ────────────────────────────
  if (err.name === "CastError") {
    statusCode = 400;
    message    = "Invalid request identifier format.";
  }

  // ── Mongoose: duplicate key ───────────────────────────
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || "field";
    message    = `A record with this ${field} already exists.`;
  }

  // ── Mongoose: validation error ────────────────────────
  if (err.name === "ValidationError") {
    statusCode = 422;
    message    = Object.values(err.errors).map((e) => e.message).join(", ");
  }

  // ── JWT errors ────────────────────────────────────────
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message    = "Invalid token.";
  }
  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message    = "Token has expired.";
  }

  // ── Payload Too Large ─────────────────────────────────
  if (err.type === "entity.too.large") {
    statusCode = 413;
    message    = "Request payload is too large.";
  }

  // ── Log all errors ────────────────────────────────────
  const logMeta = {
    statusCode,
    method:  req.method,
    path:    req.originalUrl,
    ip:      req.ip,
  };

  if (statusCode >= 500) {
    logger.error(message, { ...logMeta, stack: err.stack });
  } else {
    logger.warn(message, logMeta);
  }

  // ── GLB-004: Response — never expose any internal detail in production ──
  const isProduction = process.env.NODE_ENV === "production";

  // In production: suppress all messages for 5xx (generic) and strip stack always.
  const safeMessage = isProduction
    ? (statusCode >= 500 ? "An unexpected error occurred. Please try again later." : message)
    : message;

  res.status(statusCode).json({
    success: false,
    message: safeMessage,
    // Stack trace only in non-production environments
    ...(isProduction ? {} : { stack: err.stack }),
  });
};

export default errorHandler;
