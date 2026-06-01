import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import { getRedisClient, isRedisReady } from "../config/redis.js";

const isProd = process.env.NODE_ENV === "production";

const createRateLimitStore = (windowMs = 15 * 60 * 1000) => {
  const client = getRedisClient();
  if (!client) return undefined;
  return new RedisStore({
    sendCommand: (...args) => client.sendCommand(args),
    expiry: Math.max(1, Number(windowMs) / 1000),
    prefix: "luxe:rl:",
  });
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
const apiWindow = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;
export const apiLimiter = rateLimit({
  windowMs: apiWindow,
  // Ensure the general API limit is high enough for SPAs (minimum 10000)
  max:      Math.max(Number(process.env.RATE_LIMIT_MAX) || 0, isProd ? 10000 : 999999),
  store: isRedisReady() ? createRateLimitStore(apiWindow) : undefined,
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
  max:      15,                      // maximum 15 attempts
  store: isRedisReady() ? createRateLimitStore(15 * 60 * 1000) : undefined,
  standardHeaders: true,
  legacyHeaders:   false,
  skipSuccessfulRequests: true,       // only count failures
  message: {
    success: false,
    message: "Too many login attempts. Please try again in 15 minutes.",
  },
});

// ── Booking limiter ───────────────────────────────────────
export const bookingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,          // 1 hour
  max:      isProd ? 10 : 999999,
  store: isRedisReady() ? createRateLimitStore(60 * 60 * 1000) : undefined,
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
  store: isRedisReady() ? createRateLimitStore(15 * 60 * 1000) : undefined,
  standardHeaders: true,
  legacyHeaders:   false,
  skip: (req) => isLocalRequest(req),
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

// ── Strict Login specific limiter ────────────────────────
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,          // 15 minutes
  max:      5,                       // 5 attempts per 15 minutes
  store: isRedisReady() ? createRateLimitStore(15 * 60 * 1000) : undefined,
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    success: false,
    message: "Too many login attempts. Please try again in 15 minutes.",
  },
});

// ── Strict OTP specific limiter ──────────────────────────
export const otpRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,           // 5 minutes
  max:      5,                       // 5 attempts per 5 minutes
  store: isRedisReady() ? createRateLimitStore(5 * 60 * 1000) : undefined,
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    success: false,
    message: "Too many OTP requests. Please try again in 5 minutes.",
  },
});
