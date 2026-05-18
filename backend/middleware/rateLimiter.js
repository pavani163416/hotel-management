import rateLimit from "express-rate-limit";

const isProd = process.env.NODE_ENV === "production";

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
  max:      Number(process.env.RATE_LIMIT_MAX)        || (isProd ? 1000 : 999999),
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
  standardHeaders: true,
  legacyHeaders:   false,
  skip: (req) => isLocalRequest(req),
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});
