import rateLimit from "express-rate-limit";

const isProd = process.env.NODE_ENV === "production";

// ── General API limiter ───────────────────────────────────
export const apiLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max:      Number(process.env.RATE_LIMIT_MAX)        || (isProd ? 100 : 1000),
  standardHeaders: true,
  legacyHeaders:   false,
  // Skip rate limiting for promo/validate — it has its own dedicated limiter
  // and fires multiple times per page load (one per available coupon code)
  skip: (req) => req.path.startsWith("/promo"),
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

// ── Auth limiter — login endpoints ────────────────────────
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,          // 15 minutes
  max:      isProd ? 50 : 100,        // 50 attempts in prod (raised for testing)
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
  max:      isProd ? 10 : 1000,
  standardHeaders: true,
  legacyHeaders:   false,
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
  max:      isProd ? 200 : 2000,
  standardHeaders: true,
  legacyHeaders:   false,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});
