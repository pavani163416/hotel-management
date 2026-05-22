import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { getRedisClient, isRedisReady } from "../config/redis.js";

const isProd = process.env.NODE_ENV === "production";

const createRateLimitStore = () => {
  const client = getRedisClient();
  if (!client) return undefined;
  return new RedisStore({
    sendCommand: (...args) => client.sendCommand(args),
    expiry: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000) / 1000,
    prefix: "luxe:rl:",
  });
};

const getClientIp = (req) => {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.connection?.remoteAddress || "unknown";
};

// Helper to determine if a request originates locally
const isLocalRequest = (req) => {
  const ip = req.ip || req.connection.remoteAddress || "";
  const host = req.headers.host || "";
  return ip.includes("127.0.0.1") || 
         ip.includes("::1") || 
         ip.includes("localhost") || 
         host.includes("localhost") || 
         host.includes("127.0.0.1") || 
         host.includes("192.168.");
};

// ── General API limiter ───────────────────────────────────
export const apiLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max:      Number(process.env.RATE_LIMIT_MAX)        || (isProd ? 10000 : 999999),
  keyGenerator: getClientIp,
  store: isRedisReady() ? createRateLimitStore() : undefined,
  standardHeaders: true,
  legacyHeaders:   false,
  // Skip entirely in local dev, or for promo endpoints in production
  skip: (req) => isLocalRequest(req) || req.path.startsWith("/promo"),
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

// ── Auth limiter — login endpoints ────────────────────────
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,          // 15 minutes
  max:      isProd ? 200 : 999999,        // increased for testing
  keyGenerator: getClientIp,
  store: isRedisReady() ? createRateLimitStore() : undefined,
  standardHeaders: true,
  legacyHeaders:   false,
  skipSuccessfulRequests: true,       // only count failures
  skip: (req) => isLocalRequest(req),
  message: {
    success: false,
    message: "Too many login attempts. Please try again in 15 minutes.",
  },
});

// ── Booking limiter ───────────────────────────────────────
export const bookingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,          // 1 hour
  max:      isProd ? 10 : 999999,
  keyGenerator: getClientIp,
  store: isRedisReady() ? createRateLimitStore() : undefined,
  standardHeaders: true,
  legacyHeaders:   false,
  skip: (req) => isLocalRequest(req),
  message: {
    success: false,
    message: "Too many booking attempts. Please try again in an hour.",
  },
});

// ── Promo limiter — validate endpoint ─────────────────────
// Review page fires multiple validate calls on load (one per available code)
// so this needs a higher ceiling than the general apiLimiter.
export const promoLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,          // 15 minutes
  max:      isProd ? 200 : 999999,
  keyGenerator: getClientIp,
  store: isRedisReady() ? createRateLimitStore() : undefined,
  standardHeaders: true,
  legacyHeaders:   false,
  skip: (req) => isLocalRequest(req),
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});
