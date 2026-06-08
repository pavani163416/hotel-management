/**
 * sitemapRoutes.js
 *
 * Exposes two discovery endpoints that improve AJAX/security scanner coverage:
 *
 *  GET /sitemap.xml       — Standard XML sitemap (for crawlers and scanners)
 *  GET /api/sitemap.json  — Machine-readable JSON sitemap (for AJAX scanners
 *                           like OWASP ZAP, Burp Suite, and Nuclei that do not
 *                           parse XML well but DO follow JSON link arrays)
 *  GET /robots.txt        — Tells crawlers where to find the sitemap and which
 *                           paths are public vs restricted
 *
 * WHY THIS FIXES THE "Not many pages" SCANNER WARNING
 * ─────────────────────────────────────────────────────
 * AJAX security scanners discover endpoints by:
 *   1. Following links in HTML pages            → SPA = no server-rendered links
 *   2. Parsing sitemap.xml                      → was missing entirely
 *   3. Following robots.txt → sitemap reference → was missing entirely
 *   4. Crawling JS bundles for fetch() patterns → unreliable in minified builds
 *
 * By serving a comprehensive sitemap that lists every public API endpoint
 * and every frontend route, scanners can enumerate all attack surfaces
 * rather than only discovering the root /.
 *
 * The JSON sitemap also explicitly lists API endpoints with their HTTP methods
 * so tools like ZAP can generate AJAX requests for each one.
 */

import express from "express";

const router = express.Router();

// ── Helpers ───────────────────────────────────────────────
const FRONTEND_ORIGIN =
  process.env.FRONTEND_URL ||
  process.env.CLIENT_ORIGIN?.split(",")[0]?.trim() ||
  "https://hotel-management-frontend-puce.vercel.app";

const ADMIN_ORIGIN =
  process.env.ADMIN_URL ||
  "https://hotel-management-admin-eta.vercel.app";

const now = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

// ── Public frontend pages (customer-facing) ───────────────
const frontendPages = [
  { path: "/",               changefreq: "daily",   priority: "1.0" },
  { path: "/hotels",         changefreq: "hourly",  priority: "0.9" },
  { path: "/about",          changefreq: "monthly", priority: "0.5" },
  { path: "/terms",          changefreq: "monthly", priority: "0.3" },
  { path: "/privacy",        changefreq: "monthly", priority: "0.3" },
  { path: "/contact",        changefreq: "monthly", priority: "0.5" },
  { path: "/owner-portal",   changefreq: "monthly", priority: "0.6" },
  { path: "/support-centre", changefreq: "monthly", priority: "0.6" },
  { path: "/history",        changefreq: "daily",   priority: "0.4" },
  { path: "/profile",        changefreq: "weekly",  priority: "0.4" },
  { path: "/reset-password", changefreq: "yearly",  priority: "0.3" },
  // Dynamic route placeholders so scanners know the pattern exists
  { path: "/hotel/example-hotel-id", changefreq: "hourly", priority: "0.8" },
];

// ── Public API endpoints (GET only, no auth required) ────
const publicApiEndpoints = [
  // Auth
  { method: "GET",  path: "/api/auth/captcha" },
  { method: "POST", path: "/api/auth/register" },
  { method: "POST", path: "/api/auth/login" },
  { method: "POST", path: "/api/auth/forgot-password" },
  { method: "POST", path: "/api/auth/reset-password" },
  { method: "POST", path: "/api/auth/verify-otp" },
  { method: "POST", path: "/api/auth/resend-otp" },
  { method: "POST", path: "/api/auth/refresh-token" },
  { method: "POST", path: "/api/auth/logout" },
  { method: "POST", path: "/api/auth/google" },
  { method: "POST", path: "/api/auth/firebase" },
  { method: "GET",  path: "/api/auth/google/callback" },
  { method: "POST", path: "/api/auth/phone/send" },
  { method: "POST", path: "/api/auth/phone/verify" },

  // Hotels (public read)
  { method: "GET",  path: "/api/hotels" },
  { method: "GET",  path: "/api/hotels/:id" },
  { method: "GET",  path: "/api/search" },

  // Rooms (public read)
  { method: "GET",  path: "/api/rooms" },
  { method: "GET",  path: "/api/rooms/:id" },
  { method: "GET",  path: "/api/rooms/available-count" },
  { method: "POST", path: "/api/rooms/availability" },

  // Room types (public read)
  { method: "GET",  path: "/api/room-types" },

  // Promos
  { method: "POST", path: "/api/promo/validate" },

  // Coupons (public list)
  { method: "GET",  path: "/api/admin/coupons-public" },

  // Visitors / tracking (public write)
  { method: "POST",  path: "/api/visitors/track" },
  { method: "PATCH", path: "/api/visitors/convert" },

  // SSE
  { method: "GET",  path: "/api/sse/hotels" },

  // Support (public ticket creation)
  { method: "POST", path: "/api/public/support/create" },

  // Property owner self-service (public)
  { method: "POST", path: "/api/owners/register" },
  { method: "POST", path: "/api/owners/verify-email" },
  { method: "POST", path: "/api/owners/login" },

  // Manager login (public)
  { method: "POST", path: "/api/manager/login" },

  // Admin login (public)
  { method: "POST", path: "/api/admin/login" },

  // Health
  { method: "GET",  path: "/api/health" },
  { method: "GET",  path: "/" },
];

// ── GET /sitemap.xml ──────────────────────────────────────
router.get("/sitemap.xml", (req, res) => {
  const urlEntries = frontendPages.map(
    (p) => `
  <url>
    <loc>${FRONTEND_ORIGIN}${p.path}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`
  ).join("");

  // Include public API GET endpoints as extended-sitemap entries so scanners
  // that parse extended sitemaps (ZAP spider) discover them
  const apiGetEntries = publicApiEndpoints
    .filter((e) => e.method === "GET")
    .map(
      (e) => `
  <url>
    <loc>${req.protocol}://${req.get("host")}${e.path}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>`
    ).join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${urlEntries}
${apiGetEntries}
</urlset>`;

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.status(200).send(xml);
});

// ── GET /api/sitemap.json ─────────────────────────────────
// AJAX scanners (ZAP, Burp) that don't parse XML will consume this.
// It enumerates every discoverable endpoint with its HTTP method so
// the scanner can generate a test request for each surface.
router.get("/api/sitemap.json", (req, res) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;

  res.setHeader("Cache-Control", "public, max-age=3600");
  res.json({
    generated: new Date().toISOString(),
    baseUrl,
    frontendOrigin: FRONTEND_ORIGIN,
    adminOrigin: ADMIN_ORIGIN,

    // Frontend pages — scanner should visit these to discover in-page AJAX calls
    frontendPages: frontendPages.map((p) => ({
      url: `${FRONTEND_ORIGIN}${p.path}`,
      type: "page",
      changefreq: p.changefreq,
    })),

    // All public API endpoints with their HTTP method
    // Scanners use this list to build AJAX test requests
    apiEndpoints: publicApiEndpoints.map((e) => ({
      method:      e.method,
      path:        e.path,
      url:         `${baseUrl}${e.path}`,
      auth:        "none",
      description: e.description || "",
    })),

    // Swagger UI — scanners that understand OpenAPI can import this directly
    apiDocs: {
      swaggerUi:   `${baseUrl}/api/docs`,
      openApiJson: `${baseUrl}/api/docs.json`,
    },
  });
});

// ── GET /robots.txt ───────────────────────────────────────
// Standard robots.txt pointing to the sitemap.
// Security scanners respect this file to discover sitemaps.
router.get("/robots.txt", (req, res) => {
  const baseUrl = `${req.protocol}://${req.get("host")}`;

  const content = `# LuxeStay robots.txt
User-agent: *
Allow: /

# Disallow internal/admin API paths from public crawlers
Disallow: /api/admin/
Disallow: /api/manager/
Disallow: /api/controller/
Disallow: /api/guests/
Disallow: /api/notifications/
Disallow: /api/upload/

# Allow public API paths explicitly
Allow: /api/hotels
Allow: /api/rooms
Allow: /api/search
Allow: /api/auth/captcha
Allow: /api/promo/
Allow: /api/sitemap.json
Allow: /api/docs

# Sitemap locations
Sitemap: ${baseUrl}/sitemap.xml
Sitemap: ${baseUrl}/api/sitemap.json
`;

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.status(200).send(content);
});

export default router;
