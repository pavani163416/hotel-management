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
  "https://athithigriha-frontend.vercel.app",
  "https://athithigriha-admin.vercel.app",
  "https://hotel-management-admin-eta.vercel.app",
  "https://hotel-management-admin-ten.vercel.app",
  "https://hotel-management-frontend-blue-nine.vercel.app",
  "https://hotel-management-frontend-puce.vercel.app",
  "https://athithigriha-frontend.vercel.app",
  "",
  ...RAW_ORIGINS,
];

function isTrustedVercelDomain(origin) {
  if (!origin) return false;
  try {
    const hostname = new URL(origin).hostname;
    const allowedSubstrings = [
      "hotel-mgnt",
      "athithigriha-frontend",
      "athithigriha-admin",
      "hotel-management-admin-eta",
      "hotel-management-frontend",
      "hotel-management",
      "athithigriha"
    ];
    return hostname.endsWith(".vercel.app") && allowedSubstrings.some(sub => hostname.includes(sub));
  } catch {
    return false;
  }
}

function isOriginTrusted(origin) {
  if (!origin) return false;
  // Exact match
  if (TRUSTED_ORIGINS.includes(origin)) return true;
  // Trusted Vercel preview deployment
  if (isTrustedVercelDomain(origin)) return true;
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

  // Bypass CSRF validation for webhook routes and CSP violation reports
  if (req.path.startsWith("/webhooks") || req.path.startsWith("/api/webhooks") || req.path === "/csp-report") {
    return next();
  }

  // Bypass CSRF for token-authorized requests (inherently immune to CSRF as browsers do not auto-attach Authorization headers)
  if (req.headers.authorization?.startsWith("Bearer ")) {
    return next();
  }

  // Bypass CSRF for pre-authentication and authentication endpoints
  if (req.path.startsWith("/auth") || req.path.startsWith("/api/auth")) {
    return next();
  }

  const origin  = req.headers["origin"];
  const referer = req.headers["referer"];

  // Derive origin from Referer if Origin is absent or string "null"/"undefined"
  let effectiveOrigin = origin;
  if ((!effectiveOrigin || effectiveOrigin === "null" || effectiveOrigin === "undefined") && referer) {
    try {
      const url = new URL(referer);
      effectiveOrigin = url.origin;
    } catch {
      // Malformed referer — treat as untrusted
    }
  }

  // Debug logging for CSRF troubleshooting
  console.log(`[CSRF CHECK] Path: ${req.path}, Method: ${req.method}, Origin Header: ${origin}, Referer Header: ${referer}, Effective Origin: ${effectiveOrigin}`);

  // No origin at all — allow server-to-server / Postman / curl in non-prod.
  // In production or if cookies/credentials are present, require an origin for mutating requests.
  const isProd = process.env.NODE_ENV === "production";
  const hasCookies = req.headers.cookie || (req.cookies && Object.keys(req.cookies).length > 0);
  if (!effectiveOrigin || effectiveOrigin === "null" || effectiveOrigin === "undefined") {
    if (!isProd && !hasCookies) return next();
    return res.status(403).json({
      success: false,
      message: "Forbidden: missing origin header.",
    });
  }

  if (!isOriginTrusted(effectiveOrigin)) {
    console.warn(`[CSRF REJECTED] Origin ${effectiveOrigin} is not trusted.`);
    return res.status(403).json({
      success: false,
      message: "Forbidden: cross-origin request rejected.",
    });
  }

  next();
};

export default csrfProtection;
