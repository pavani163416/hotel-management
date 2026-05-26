/**
 * csrfProtection.js — GLB-008: CSRF Origin Validation Middleware
 *
 * Protects state-mutating endpoints (POST / PUT / PATCH / DELETE) from
 * Cross-Site Request Forgery by validating the Origin (or Referer) header
 * against the same allowedOrigins list used for CORS.
 *
 * Works without a separate CSRF token by leveraging the SameSite cookie
 * attribute combined with strict origin validation — a recognised defense-in-depth
 * approach for stateless JWT APIs.
 *
 * Usage:
 *   import csrfProtection from "./middleware/csrfProtection.js";
 *   router.patch("/profile", csrfProtection, verifyCustomerToken, handler);
 */

const SAFE_METHODS   = new Set(["GET", "HEAD", "OPTIONS"]);

// Same origins accepted by CORS — keep in sync with server.js allowedOrigins.
const RAW_ORIGINS    = (process.env.CLIENT_ORIGIN || "").split(",").map((o) => o.trim()).filter(Boolean);

const TRUSTED_ORIGINS = [
  "https://hotel-mgnt.vercel.app",
  "https://luxestay-frontend.vercel.app",
  "https://luxestay-admin.vercel.app",
  ...RAW_ORIGINS,
];

function isOriginTrusted(origin) {
  if (!origin) return false;
  // Exact match
  if (TRUSTED_ORIGINS.includes(origin)) return true;
  // Any Vercel preview deployment
  if (origin.endsWith(".vercel.app")) return true;
  // Local development
  if (
    origin.startsWith("http://localhost:") ||
    origin.startsWith("http://127.0.0.1:")
  ) return true;
  return false;
}

/**
 * csrfProtection middleware
 * Rejects cross-origin state-mutating requests with 403 Forbidden.
 */
const csrfProtection = (req, res, next) => {
  // Safe methods don't mutate state — skip check
  if (SAFE_METHODS.has(req.method)) return next();

  const origin  = req.headers["origin"];
  const referer = req.headers["referer"];

  // Derive origin from Referer if Origin is absent
  let effectiveOrigin = origin;
  if (!effectiveOrigin && referer) {
    try {
      const url = new URL(referer);
      effectiveOrigin = url.origin;
    } catch {
      // Malformed referer — treat as untrusted
    }
  }

  // No origin at all — allow server-to-server / Postman / curl in non-prod.
  // In production, require an origin for mutating requests.
  const isProd = process.env.NODE_ENV === "production";
  if (!effectiveOrigin) {
    if (!isProd) return next();
    return res.status(403).json({
      success: false,
      message: "Forbidden: missing origin header.",
    });
  }

  if (!isOriginTrusted(effectiveOrigin)) {
    return res.status(403).json({
      success: false,
      message: "Forbidden: cross-origin request rejected.",
    });
  }

  next();
};

export default csrfProtection;
