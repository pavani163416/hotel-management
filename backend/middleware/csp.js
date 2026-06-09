/**
 * csp.js — Content Security Policy middleware
 *
 * This module builds a strict, environment-aware CSP header for the
 * LuxeStay backend API responses and provides a helper that generates
 * per-request nonces for any server-rendered HTML.
 *
 * PROTECTION SCOPE
 * ─────────────────
 * CSP protects against:
 *   • Cross-Site Scripting (XSS) — prevents injected scripts from executing
 *   • Data injection attacks     — restricts where data can be loaded from
 *   • Clickjacking               — frame-ancestors 'none' blocks framing
 *   • Protocol downgrade         — upgrade-insecure-requests forces HTTPS
 *   • Mixed content              — block-all-mixed-content (legacy fallback)
 *   • Malicious script injection — scriptSrc whitelist + nonce/hash support
 *
 * WHY THIS IS SEPARATE FROM helmet() IN server.js
 * ─────────────────────────────────────────────────
 * The helmet() CSP in server.js is intentionally set for the API-only
 * backend (restrictive defaultSrc: 'self'). This middleware provides the
 * same policy in a reusable, testable form so it can be:
 *   1. Applied selectively to HTML-serving routes (e.g. Swagger UI)
 *   2. Extended with nonces for inline scripts (Swagger requires this)
 *   3. Reported to a violation-collection endpoint for monitoring
 *   4. Overridden per-route without touching the global helmet config
 *
 * NONCE USAGE
 * ────────────
 * When res.locals.cspNonce is set by this middleware, you can use it in
 * any server-rendered template:
 *   <script nonce="<%= res.locals.cspNonce %>">...</script>
 *
 * Usage:
 *   import { cspMiddleware, swaggerCspMiddleware } from "./middleware/csp.js";
 *   app.use("/api/docs", swaggerCspMiddleware, swaggerUi.serve, ...);
 *   app.use("/api/my-html-route", cspMiddleware, handler);
 */

import crypto from "crypto";

// ── Trusted external origins ──────────────────────────────
const RAZORPAY_ORIGINS = [
  "https://checkout.razorpay.com",
  "https://cdn.razorpay.com",
  "https://api.razorpay.com",
  "https://lumberjack.razorpay.com",
  "https://lumberjack-dx.razorpay.com",
  "https://hooks.razorpay.com",
];

const GOOGLE_ORIGINS = [
  "https://accounts.google.com",
  "https://apis.google.com",
  "https://oauth2.googleapis.com",
  "https://www.googleapis.com",
];

const FONT_ORIGINS = [
  "https://fonts.googleapis.com",
  "https://fonts.gstatic.com",
];

// ── Build the CSP directive string ────────────────────────
/**
 * Builds a Content-Security-Policy header value.
 *
 * @param {object} options
 * @param {string}  [options.nonce]          - Random nonce for inline scripts (base64)
 * @param {boolean} [options.includeSwagger] - Relaxes policy for Swagger UI
 * @param {boolean} [options.reportOnly]     - Emit as Content-Security-Policy-Report-Only
 * @returns {{ header: string, directive: string }}
 */
export function buildCspDirectives({ nonce, includeSwagger = false } = {}) {
  const nonceSnippet = nonce ? [`'nonce-${nonce}'`] : [];

  // script-src: allow nonce + whitelisted CDNs; no unsafe-inline in strict mode
  const scriptSrc = [
    "'self'",
    ...nonceSnippet,
    ...RAZORPAY_ORIGINS.filter((o) =>
      ["https://checkout.razorpay.com", "https://cdn.razorpay.com"].includes(o)
    ),
    ...GOOGLE_ORIGINS.filter((o) =>
      ["https://accounts.google.com", "https://apis.google.com"].includes(o)
    ),
    // Swagger UI requires unsafe-inline for its dynamically generated content
    ...(includeSwagger ? ["'unsafe-inline'", "'unsafe-eval'"] : []),
  ].join(" ");

  const scriptSrcElem = [
    "'self'",
    ...nonceSnippet,
    "https://checkout.razorpay.com",
    "https://cdn.razorpay.com",
    "https://accounts.google.com",
    "https://apis.google.com",
    ...(includeSwagger ? ["'unsafe-inline'"] : []),
  ].join(" ");

  const directives = [
    `default-src 'self'`,
    `script-src ${scriptSrc}`,
    `script-src-elem ${scriptSrcElem}`,
    `style-src 'self' 'unsafe-inline' ${FONT_ORIGINS[0]} https://checkout.razorpay.com https://cdn.razorpay.com`,
    `style-src-elem 'self' 'unsafe-inline' ${FONT_ORIGINS[0]}`,
    `font-src 'self' ${FONT_ORIGINS[1]} data:`,
    `img-src 'self' data: https: blob:`,
    `frame-src 'self' https://checkout.razorpay.com https://api.razorpay.com https://cdn.razorpay.com https://accounts.google.com https://maps.google.com https://www.google.com`,
    `connect-src 'self' ${RAZORPAY_ORIGINS.join(" ")} ${GOOGLE_ORIGINS.join(" ")} https://countriesnow.space https://hotel-management-production-2225.up.railway.app wss://hotel-management-production-2225.up.railway.app ws://localhost:5000 http://localhost:5000`,
    `worker-src 'self' blob:`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
    `block-all-mixed-content`,
  ].join("; ");

  return directives;
}

// ── Standard API CSP middleware ───────────────────────────
/**
 * Express middleware that sets a strict CSP header and attaches a
 * per-request nonce to res.locals.cspNonce for use in templates.
 *
 * Apply this to any route that serves HTML (e.g. error pages, reports).
 * The backend API routes themselves don't serve HTML, but having this
 * ensures any HTML surface (404 pages, error responses) is covered.
 */
export const cspMiddleware = (req, res, next) => {
  const nonce = crypto.randomBytes(16).toString("base64");
  res.locals.cspNonce = nonce;

  const directives = buildCspDirectives({ nonce });
  res.setHeader("Content-Security-Policy", directives);
  next();
};

// ── Swagger-specific CSP middleware ──────────────────────
/**
 * Relaxed CSP for Swagger UI routes only.
 * Swagger's bundled JS requires unsafe-inline and unsafe-eval.
 * Keeping this isolated ensures the relaxation doesn't bleed
 * into other routes.
 */
export const swaggerCspMiddleware = (req, res, next) => {
  const nonce = crypto.randomBytes(16).toString("base64");
  res.locals.cspNonce = nonce;

  const directives = buildCspDirectives({ nonce, includeSwagger: true });
  res.setHeader("Content-Security-Policy", directives);
  next();
};

/**
 * Report-only CSP middleware.
 * Set on any route to observe violations without blocking — useful during
 * initial deployment of a new policy.
 *
 * @param {string} reportUri - The endpoint that receives violation reports
 */
export const cspReportOnlyMiddleware = (reportUri = "/api/csp-report") =>
  (req, res, next) => {
    const nonce = crypto.randomBytes(16).toString("base64");
    res.locals.cspNonce = nonce;

    const directives = buildCspDirectives({ nonce }) + `; report-uri ${reportUri}`;
    res.setHeader("Content-Security-Policy-Report-Only", directives);
    next();
  };

export default cspMiddleware;
