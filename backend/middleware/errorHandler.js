/**
 * errorHandler.js — Global Error Handler Middleware
 * Must be registered LAST in Express (after all routes).
 * Never exposes stack traces in production.
 */

import logger from "../utils/logger.js";

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message    = err.message    || "Internal Server Error";

  // ── Mongoose: bad ObjectId ────────────────────────────
  if (err.name === "CastError") {
    statusCode = 400;
    message    = `Invalid ID format: ${err.value}`;
  }

  // ── Mongoose: duplicate key ───────────────────────────
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0] || "field";
    message    = `A record with this ${field} already exists`;
  }

  // ── Mongoose: validation error ────────────────────────
  if (err.name === "ValidationError") {
    statusCode = 422;
    message    = Object.values(err.errors).map((e) => e.message).join(", ");
  }

  // ── JWT errors ────────────────────────────────────────
  if (err.name === "JsonWebTokenError") {
    statusCode = 401;
    message    = "Invalid token";
  }
  if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message    = "Token has expired";
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

  // ── Response — never expose stack in production ───────
  const isProduction = process.env.NODE_ENV === "production";
  res.status(statusCode).json({
    success: false,
    message: isProduction && statusCode === 500 ? "Internal server error" : message,
    ...(isProduction ? {} : { stack: err.stack }),
  });
};

export default errorHandler;
