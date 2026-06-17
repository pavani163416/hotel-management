import "dotenv/config"; // reload trigger update
import express          from "express";
import cors             from "cors";
import helmet           from "helmet";
import morgan           from "morgan";
import mongoSanitize    from "express-mongo-sanitize";
import xss              from "xss-clean";
import hpp              from "hpp";
import cookieParser     from "cookie-parser";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { WebSocketServer } from "ws";
import jwt              from "jsonwebtoken";
import { initWebSocket } from "./routes/wsRoutes.js";

import connectDB        from "./config/db.js";
import connectAdminDB   from "./config/adminDb.js";
import { initializeRedis, createRedisAdapterClients, isRedisReady } from "./config/redis.js";
import { createSessionMiddleware } from "./config/session.js";
import roomRoutes       from "./routes/roomRoutes.js";
import bookingRoutes    from "./routes/bookingRoutes.js";
import paymentRoutes    from "./routes/paymentRoutes.js";
import webhookRoutes    from "./routes/webhookRoutes.js";
import guestRoutes      from "./routes/guestRoutes.js";
import adminRoutes      from "./routes/adminRoutes.js";
import visitorRoutes    from "./routes/visitorRoutes.js";
import hotelRoutes      from "./routes/hotelRoutes.js";
import { getHotels }    from "./controllers/hotelController.js";
import controllerRoutes from "./routes/controllerRoutes.js";
import managerRoutes    from "./routes/managerRoutes.js";
import sseRoutes        from "./routes/sseRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import uploadRoutes     from "./routes/uploadRoutes.js";
import authRoutes       from "./routes/authRoutes.js";
import promoRoutes      from "./routes/promoRoutes.js";
import assistanceRoutes from "./routes/assistanceRoutes.js";
import roomTypeRoutes from "./routes/roomTypeRoutes.js";
import maintenanceRoutes from "./routes/maintenanceRoutes.js";
import publicSupportRoutes from "./routes/publicSupportRoutes.js";
import propertyOwnerRoutes from "./routes/propertyOwnerRoutes.js";
import ownerAnalyticsRoutes from "./routes/ownerAnalyticsRoutes.js";
import sitemapRoutes    from "./routes/sitemapRoutes.js";
import newsletterRoutes from "./routes/newsletterRoutes.js";
import chatRoutes       from "./routes/chatRoutes.js";
import waitlistRoutes          from "./routes/waitlistRoutes.js";
import lostFoundRoutes from "./routes/lostFoundRoutes.js";
import tripPlanRoutes from "./routes/tripPlanRoutes.js";
import errorHandler     from "./middleware/errorHandler.js";
import csrfProtection  from "./middleware/csrfProtection.js";
import { swaggerCspMiddleware } from "./middleware/csp.js";
import { apiLimiter, bookingLimiter, promoLimiter, authRateLimiter, adminRateLimiter, publicRateLimiter } from "./middleware/rateLimiter.js";
import { roomNames, setNotificationIo } from "./utils/notificationService.js";
import logger           from "./utils/logger.js";
import swaggerUi        from "swagger-ui-express";
import swaggerDocument  from "./swagger.js";
import { initCleanupJobs } from "./cron/cleanupJobs.js";

// ── Validate required env vars on startup ─────────────────
// Only MONGO_URI and JWT_SECRET are strictly required in development.
// Production mode requires full deployment credentials to fail fast.
const REQUIRED_ENV = ["MONGO_URI", "JWT_SECRET"];
if (process.env.NODE_ENV === "production") {
  REQUIRED_ENV.push(
    "MONGO_ADMIN_URI",
    "RAZORPAY_KEY_ID",
    "RAZORPAY_KEY_SECRET",
    "REDIS_URL"
  );
}
const uniqueRequired = [...new Set(REQUIRED_ENV)];
const missing = uniqueRequired.filter((k) => !process.env[k]);
if (missing.length) {
  logger.error(`CRITICAL: Missing required environment variables on startup: ${missing.join(", ")}`);
  process.exit(1);
}

// ── Initialize Redis and session cache layer ──────────────
await initializeRedis();

// ── Connect to both databases ─────────────────────────────
connectDB();
connectAdminDB();

// ── Initialize scheduled cron jobs ─────────────────────────
initCleanupJobs();

// ── Startup: reset rooms whose booking checkout has passed ──
// Runs once on server start so stale "Booked" rooms are freed immediately.
import("./models/Booking.js").then(async ({ default: Booking }) => {
  const Room = (await import("./models/Room.js")).default;
  try {
    const past = await Booking.find({
      status:   { $in: ["Confirmed", "CheckedIn"] },
      checkOut: { $lt: new Date() },
    }).select("_id room");
    for (const b of past) {
      await Room.findByIdAndUpdate(b.room, { status: "Available" }).catch(() => {});
      await Booking.findByIdAndUpdate(b._id, { status: "CheckedOut" }).catch(() => {});
    }
    if (past.length) logger.info(`Startup cleanup: reset ${past.length} past-checkout room(s)`);
  } catch { /* non-blocking */ }
}).catch(() => {});

// ── Startup: sync hotel embedded rooms → standalone Room collection ──────────
// Ensures every room visible in the admin panel is also visible in the manager
// panel. Runs on every startup — safe to re-run (upserts, never duplicates).
import("./models/Hotel.js").then(async ({ default: Hotel }) => {
  const Room = (await import("./models/Room.js")).default;
  const BED_TYPE_MAP = {
    "1 King Bed": "King", "2 King Beds": "King", "King": "King",
    "1 Queen Bed": "Queen", "Queen": "Queen",
    "2 Twin Beds": "Twin", "Twin": "Twin",
    "1 King Bed + Sofa": "King",
    "Single": "Single", "Double": "Double",
  };
  try {
    const hotels = await Hotel.find({ isActive: true }).lean();
    let synced = 0;
    for (const hotel of hotels) {
      if (!hotel.rooms?.length) continue;
      for (const embRoom of hotel.rooms) {
        if (!embRoom.id) continue;
        const nameLower = (embRoom.name || "").toLowerCase();
        let type = "Standard";
        if (nameLower.includes("suite"))      type = "Suite";
        else if (nameLower.includes("deluxe")) type = "Deluxe";
        else if (nameLower.includes("penthouse")) type = "Penthouse";
        else if (nameLower.includes("villa"))  type = "Villa";
        const bedType = BED_TYPE_MAP[embRoom.bed] || "King";
        await Room.findOneAndUpdate(
          { roomNumber: embRoom.id },
          {
            $setOnInsert: {
              roomNumber:    embRoom.id,
              type,
              description:   embRoom.description || `${embRoom.name} at ${hotel.name}`,
              pricePerNight: embRoom.price || 0,
              capacity:      embRoom.capacity || 2,
              bedType,
              amenities:     embRoom.features || [],
              status:        (embRoom.available ?? 1) > 0 ? "Available" : "Booked",
              isActive:      true,
            },
            $set: {
              hotelStringId: hotel.hotelId,
              hotelId:       hotel._id,
              roomTypeId:    embRoom.id,
            },
          },
          { upsert: true, new: true }
        );
        synced++;
      }
    }
    if (synced) logger.info(`Startup sync: ensured ${synced} hotel room(s) in standalone collection`);
    try {
      const { invalidateAllCaches } = await import("./cache/redisCache.js");
      await invalidateAllCaches();
      logger.info("Startup cache invalidation: successfully cleared all Redis caches");
    } catch (cacheErr) {
      logger.warn("Startup cache invalidation failed (non-blocking)", { error: cacheErr.message });
    }
  } catch (err) {
    logger.warn("Startup room sync failed (non-blocking)", { error: err.message });
  }
}).catch(() => {});

const app = express();
app.disable("x-powered-by");

// Global Request Logger for Debugging
app.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.originalUrl} | Origin: ${req.headers.origin || 'None'}`);
  next();
});

// Set X-Robots-Tag globally on all API and backend responses
app.use((req, res, next) => {
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  next();
});

// Hardening: Block access to sensitive files/directories (e.g. .git, .env, package.json, lockfiles)
app.use((req, res, next) => {
  const lowerPath = req.path.toLowerCase();
  if (
    lowerPath.includes("/.git") ||
    lowerPath.includes("/.env") ||
    lowerPath.includes("/package.json") ||
    lowerPath.includes("/package-lock.json") ||
    lowerPath.includes("/yarn.lock") ||
    lowerPath.includes("/pnpm-lock.yaml")
  ) {
    return res.status(403).json({
      success: false,
      message: "Access Denied: Restricted system file.",
    });
  }
  next();
});

app.use(cookieParser());
app.use(createSessionMiddleware());

const isProd     = process.env.NODE_ENV === "production";
if (isProd) {
  app.set("trust proxy", true);
}

// ── CORS ─────────────────────────────────────────────────
const rawOrigins = [
  ...(process.env.CLIENT_ORIGIN || "").split(","),
  ...(process.env.FRONTEND_URL || "").split(","),
  ...(process.env.ADMIN_URL || "").split(","),
].map((o) => o.replace(/['"]/g, "").trim()).filter(Boolean);

// Always-allowed origins (Vercel deployments + local dev)
const allowedOrigins = [
  "https://hotel-management-frontend-puce.vercel.app",
  "https://hotel-management-admin-eta.vercel.app",
  "https://hotel-management-admin-ten.vercel.app",
  "https://hotel-management-frontend-blue-nine.vercel.app",
  "https://athithigriha-frontend.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:8080",
  ...rawOrigins,
];

const STRICT_VERCEL_REGEXES = [
  /^https:\/\/hotel-management-frontend-pr-\d+\.vercel\.app$/,
  /^https:\/\/hotel-management-admin-eta-pr-\d+\.vercel\.app$/,
  /^https:\/\/hotel-management-frontend-.*\.vercel\.app$/,
  /^https:\/\/hotel-management-admin-.*\.vercel\.app$/,
  /^https:\/\/athithigriha-frontend-pr-\d+\.vercel\.app$/,
  /^https:\/\/athithigriha-admin-pr-\d+\.vercel\.app$/,
  /^https:\/\/hotel-mgnt-pr-\d+\.vercel\.app$/,
  /^https:\/\/athithigriha-.*-pr-\d+\.vercel\.app$/,
  /^https:\/\/athithigriha-.*\.vercel\.app$/
];

const isTrustedVercelDomain = (origin) => {
  if (!origin) return false;
  return STRICT_VERCEL_REGEXES.some((regex) => regex.test(origin));
};

const isValidOrigin = (origin) => {
  if (!origin || origin === "null" || origin === "undefined") return false;
  if (allowedOrigins.includes(origin)) return true;
  // Dynamic Vercel subdomains allowed for PR deployments and branching
  if (origin.endsWith('.vercel.app')) return true;
  if (isTrustedVercelDomain(origin)) return true;
  return false;
};

const corsOptions = {
  origin: function (origin, callback) {
    console.log("CORS Check - Origin:", origin);
    const allowed = isValidOrigin(origin);
    console.log("CORS Check - Allowed:", allowed);
    
    if (!origin) return callback(null, true);
    if (allowed) return callback(null, true);
    callback(new Error("Not allowed by CORS"));
  },
  methods:        ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token", "X-Requested-With"],
  credentials:    true,
  optionsSuccessStatus: 204,
};

const socketCorsOrigin = (origin, callback) => {
  if (!origin) return callback(null, true);
  if (isValidOrigin(origin)) return callback(null, true);
  callback(null, false);
};

// ── GLB-003: Content-Security-Policy and Security Headers ──
// Applied globally HERE (before OPTIONS, CORS, and sitemap routes)
// so that scanners testing /sitemap.xml or sending OPTIONS
// will properly see X-Content-Type-Options: nosniff
app.use(helmet({
  hsts: isProd ? {
    maxAge:            31536000,
    includeSubDomains: true,
    preload:           true,
  } : false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "unsafe-none" },
  noSniff:              true,
  frameguard:           { action: "deny" },
  hidePoweredBy:        true,
  permissionsPolicy: {
    features: { geolocation: ["'none'"], microphone: ["'none'"], camera: ["'none'"] }
  },
  xssFilter:            true,
  referrerPolicy:       { policy: "strict-origin-when-cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc:    ["'self'"],
      // Razorpay checkout + risk-detection bundle + Google OAuth
      scriptSrc:     [
        "'self'",
        "https://checkout.razorpay.com",
        "https://cdn.razorpay.com",
        "https://accounts.google.com",
        "https://apis.google.com",
      ],
      scriptSrcElem: [
        "'self'",
        "https://checkout.razorpay.com",
        "https://cdn.razorpay.com",
        "https://accounts.google.com",
        "https://apis.google.com",
      ],
      styleSrc:      ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc:       ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc:        ["'self'", "data:", "https:", "blob:"],
      // Razorpay payment iframes + Google sign-in popup
      frameSrc:      [
        "'self'",
        "https://checkout.razorpay.com",
        "https://cdn.razorpay.com",
        "https://api.razorpay.com",
        "https://accounts.google.com",
        "https://maps.google.com",
        "https://www.google.com",
      ],
      // XHR/fetch to Razorpay APIs, Google APIs, and our backend
      connectSrc:    [
        "'self'",
        "https://api.razorpay.com",
        "https://checkout.razorpay.com",
        "https://cdn.razorpay.com",
        "https://lumberjack.razorpay.com",
        "https://accounts.google.com",
        "https://oauth2.googleapis.com",
        "https://countriesnow.space",
        "https://ipapi.co",
        "https://freeipapi.com",
        "",
        "",
        "ws://localhost:5000",
        "http://localhost:5000",
      ],
      objectSrc:     ["'none'"],
      frameAncestors:["'none'"],
      formAction:    ["'self'"],
      baseUri:       ["'self'"],
      upgradeInsecureRequests: [],
    },
  },
}));

// ── Global CORS Middleware ──
// Preflight OPTIONS MUST be handled BEFORE any other middleware (helmet, CSRF, etc.)
// Otherwise the 204 response is sent without CORS headers and browsers block the request.
app.options("*", cors(corsOptions));
app.use(cors(corsOptions));

// ── Sitemap, robots.txt, and route discovery ─────────────
// Mounted BEFORE CSRF middleware so unauthenticated crawlers/scanners
// can access discovery endpoints without needing an Origin header.
app.use(sitemapRoutes);

// ── Swagger / API documentation ──────────────────────────
// Apply the Swagger-specific CSP so the UI works while keeping the
// relaxed policy scoped only to documentation routes.
// Hardening: Disable Swagger documentation in production to prevent schema/API map disclosure.
app.use("/api/docs", (req, res, next) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found` });
  }
  next();
}, swaggerCspMiddleware, swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get(["/api/docs", "/api/docs/"], (req, res, next) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found` });
  }
  next();
}, swaggerCspMiddleware, (req, res) => swaggerUi.setup(swaggerDocument)(req, res));

app.get("/api/docs.json", (req, res, next) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found` });
  }
  next();
}, (req, res) => res.json(swaggerDocument));

app.get("/api/docs/swagger.json", (req, res, next) => {
  if (process.env.NODE_ENV === "production") {
    return res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found` });
  }
  next();
}, (req, res) => res.json(swaggerDocument));

app.get("/api/search", getHotels);

// ── Additional headers for WebSocket support ──────────────
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  next();
});

// (Helmet CSP and Security Headers moved up above OPTIONS handler)

// ── GLB-007: HTTP Verb Tampering — allow only known methods ──
const ALLOWED_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"]);
app.use((req, res, next) => {
  if (!ALLOWED_METHODS.has(req.method)) {
    res.set("Allow", [...ALLOWED_METHODS].join(", "));
    return res.status(405).json({ success: false, message: "Method Not Allowed" });
  }
  next();
});

// ── GLB-007: OPTIONS Disclosure — minimal response ────────────
// The global cors() handler above already handles OPTIONS correctly.
// Strip any extra header hints for non-CORS OPTIONS requests.
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    // Do not disclose internal headers; just let CORS middleware respond.
    res.removeHeader("X-Powered-By");
  }
  next();
});

// ── Force HTTPS redirect in production ───────────────────
// Railway terminates TLS and sets x-forwarded-proto.
// Skip redirect for health check and WebSocket paths.
if (isProd) {
  app.use((req, res, next) => {
    // Skip redirect for root, health check, Socket.IO, WS upgrade, and preflight requests
    const upgradeHeader = req.headers["upgrade"]?.toLowerCase();
    if (
      req.path === "/" ||
      req.path === "/api/health" ||
      req.path.startsWith("/socket.io") ||
      req.path.startsWith("/ws") ||
      upgradeHeader === "websocket" ||
      req.method === "OPTIONS"
    ) {
      return next();
    }

    const proto = req.headers["x-forwarded-proto"];
    if (proto && proto !== "https") {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

// ── GLB-005: Request Body Size Limit — tight cap ────────────
// Limit to 100kb for JSON / urlencoded / text; allow up to 10mb only
// for explicit upload endpoints (applied per-router in uploadRoutes.js).
const isUploadPath = (path) => {
  return (
    path.startsWith("/api/upload/image") ||
    path.startsWith("/api/owners/apply") ||
    path.startsWith("/api/public/support/create")
  );
};

app.use((req, res, next) => {
  if (isUploadPath(req.path)) {
    return next();
  }
  const contentLength = req.headers["content-length"];
  if (contentLength && parseInt(contentLength, 10) > 102400) {
    return res.status(413).json({ success: false, message: "Request payload is too large." });
  }
  next();
});

app.use((req, res, next) => {
  if (req.path.startsWith("/api/upload/image")) {
    return next();
  }
  express.json({
    limit: "100kb",
    verify: (req, res, buf) => {
      req.rawBody = buf;
    }
  })(req, res, next);
});

app.use((req, res, next) => {
  if (req.path.startsWith("/api/upload/image")) {
    return next();
  }
  express.urlencoded({ extended: true, limit: "100kb" })(req, res, next);
});

app.use((req, res, next) => {
  if (req.path.startsWith("/api/upload/image")) {
    return next();
  }
  express.text({ type: "text/plain", limit: "100kb" })(req, res, next);
});

// ── NoSQL injection sanitization ─────────────────────────
app.use(mongoSanitize());

// ── XSS Protection ─────────────────────────────────────────
// Sanitize user input coming from POST body, GET queries, and URL params
app.use(xss());

// ── HTTP Parameter Pollution Protection ────────────────────
// Prevents duplicate query string parameters which could cause unexpected behaviors
app.use(hpp());

// ── GLB-006: Prototype Pollution Protection ───────────────
// Strip __proto__, constructor, and prototype keys recursively to prevent prototype pollution.
app.use((req, res, next) => {
  const DANGEROUS_KEYS = ["__proto__", "constructor", "prototype"];
  const sanitize = (obj) => {
    if (!obj || typeof obj !== "object") return;
    const keys = Object.getOwnPropertyNames(obj);
    for (const key of keys) {
      if (DANGEROUS_KEYS.includes(key)) {
        try {
          delete obj[key];
        } catch (e) {}
      } else if (obj[key] && typeof obj[key] === "object") {
        sanitize(obj[key]);
      }
    }
  };
  sanitize(req.body);
  sanitize(req.query);
  sanitize(req.params);

  // XSS Sanitization: Globally escape or strip basic HTML tags from string inputs
  const sanitizeXSS = (obj) => {
    if (!obj || typeof obj !== "object") return;
    for (const key of Object.keys(obj)) {
      if (typeof obj[key] === "string") {
        // Simple HTML stripping to prevent basic XSS reflection
        obj[key] = obj[key].replace(/<[^>]*>?/gm, '');
      } else if (obj[key] && typeof obj[key] === "object") {
        sanitizeXSS(obj[key]);
      }
    }
  };
  sanitizeXSS(req.body);
  sanitizeXSS(req.query);
  sanitizeXSS(req.params);

  // PCI DSS Sanitization: mask credit card numbers if submitted in body
  const maskPCI = (obj) => {
    if (!obj || typeof obj !== "object") return;
    for (const key of Object.keys(obj)) {
      if (/cardnumber|ccnum|pan/i.test(key) && typeof obj[key] === "string" && obj[key].length >= 13) {
        obj[key] = obj[key].slice(0, 4) + "********" + obj[key].slice(-4);
      } else if (obj[key] && typeof obj[key] === "object") {
        maskPCI(obj[key]);
      }
    }
  };
  maskPCI(req.body);

  next();
});

// ── HTTP request logging ──────────────────────────────────
app.use(morgan(isProd ? "combined" : "dev", { stream: logger.stream }));

// ── Rate limiting ─────────────────────────────────────────
app.use("/api/auth", authRateLimiter);
app.use("/api/admin", adminRateLimiter);
app.use("/api/manager", adminRateLimiter);
app.use("/api/controller", adminRateLimiter);

app.use("/api", (req, res, next) => {
  if (
    req.path.startsWith("/auth") ||
    req.path.startsWith("/admin") ||
    req.path.startsWith("/manager") ||
    req.path.startsWith("/controller")
  ) {
    return next();
  }
  publicRateLimiter(req, res, next);
});
// bookingLimiter is applied per-route in bookingRoutes.js (POST only)

// ── Health check ──────────────────────────────────────────
app.get("/", (req, res) => {
  res.status(200).json({
    success:     true,
    message:     "AthithiGriha API is live",
    version:     "1.0.0",
    environment: process.env.NODE_ENV,
    endpoints: {
      rooms: "/api/rooms",
      bookings: "/api/bookings",
      guests: "/api/guests",
    },
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success:     true,
    message:     "AthithiGriha API is running",
    environment: process.env.NODE_ENV,
    redis:       isRedisReady() ? "connected" : "disconnected",
    socket:      "running",
    timestamp:   new Date().toISOString(),
  });
});

// ── Global Middlewares ────────────────────────────────────
// app.use(cors(corsOptions)); // Removed duplicate CORS middleware
// Use trust proxy 1 for express-rate-limit behind a single proxy (Railway/Vercel)
app.set("trust proxy", 1);
app.use(cookieParser());

// ── GLB-008: CSRF Protection — applied globally before all API routes ──
// Validates Origin / Referer on state-mutating requests (POST, PUT, PATCH, DELETE).
app.use("/api", csrfProtection);

// ── API Routes ────────────────────────────────────────────
app.use("/api/rooms",         roomRoutes);
app.use("/api/bookings",      bookingRoutes);
app.use("/api/payments",      paymentRoutes);
app.use("/api/webhooks",      webhookRoutes);
app.use("/api/guests",        guestRoutes);
app.use("/api/admin",         adminRoutes);
app.use("/api/manager",       managerRoutes);
app.use("/api/visitors",      visitorRoutes);
app.use("/api/sse",           sseRoutes);
app.use("/api/hotels",        hotelRoutes);
app.use("/api/controller",    controllerRoutes);
app.use("/api/upload",        uploadRoutes);
app.use("/api/auth",          authRoutes);
app.use("/api/promo",         promoLimiter, promoRoutes);
app.use("/api/assistance",    assistanceRoutes);
app.use("/api/room-types",    roomTypeRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/maintenance",   maintenanceRoutes);
app.use("/api/admin",         adminRoutes);
app.use("/api",               publicSupportRoutes);
app.use("/api/owners/analytics", ownerAnalyticsRoutes);
app.use("/api/owners",        propertyOwnerRoutes);
app.use("/api/newsletter",    newsletterRoutes);
app.use("/api/chat",          chatRoutes);
app.use("/api/waitlist",      waitlistRoutes);
app.use("/api/lost-found",    lostFoundRoutes);
app.use("/api/trip-plans",    tripPlanRoutes);

// ── CSP Violation Report endpoint ────────────────────────
// Browsers send JSON violation reports here when CSP blocks something.
// This helps catch misconfigurations or real attacks in production.
// The endpoint is intentionally unauthenticated (browsers send reports
// without credentials) but rate-limited to prevent abuse.
app.post("/api/csp-report", express.json({ type: ["application/json", "application/csp-report"], limit: "10kb" }), (req, res) => {
  const report = req.body?.["csp-report"] || req.body;
  if (report) {
    logger.warn("CSP Violation", {
      blockedUri:         report["blocked-uri"]          || report.blockedURI,
      violatedDirective:  report["violated-directive"]   || report.violatedDirective,
      effectiveDirective: report["effective-directive"]  || report.effectiveDirective,
      documentUri:        report["document-uri"]         || report.documentURI,
      originalPolicy:     report["original-policy"]      || report.originalPolicy,
      sourceFile:         report["source-file"]          || report.sourceFile,
      lineNumber:         report["line-number"]          || report.lineNumber,
      columnNumber:       report["column-number"]        || report.columnNumber,
      ip:                 req.ip,
    });
  }
  res.status(204).end();
});

// ── 404 handler ───────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// ── Global error handler (must be last) ──────────────────
app.use(errorHandler);

// ── HTTP + Socket.IO server ───────────────────────────────
const PORT       = process.env.PORT || 5000;
const httpServer = createServer(app);

const io = new SocketIOServer(httpServer, {
  path: "/socket.io/",
  transports: ["websocket", "polling"],  // Prioritize websocket, fallback to polling
  allowUpgrades: true,
  destroyUpgrade: false,
  pingInterval: 25000,
  pingTimeout: 60000,
  connectTimeout: 45000,
  maxHttpBufferSize: 1e7,
  cookie: false,
  serveClient: false,
  wsEngine: WebSocketServer,
  cors: {
    origin:      socketCorsOrigin,
    methods:     ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Upgrade"],
    exposedHeaders: ["Content-Length"],
  },
});

try {
  const { pubClient, subClient } = await createRedisAdapterClients();
  if (pubClient && subClient) {
    io.adapter(createAdapter(pubClient, subClient));
    logger.info("Socket.IO Redis adapter enabled");
  } else {
    logger.warn("Socket.IO Redis adapter not initialized; running in single-instance mode.");
  }
} catch (error) {
  logger.error("Failed to setup Socket.IO Redis adapter", { error: error?.message || error });
}

// ── Socket.IO JWT authentication ─────────────────────────
io.use((socket, next) => {
  // Retrieve JWT either from the handshake auth payload or from an Authorization header.
  const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(" ")[1];

  // If no token is supplied, treat the connection as unauthenticated but allow it.
  if (!token) {
    socket.data.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.data.user = decoded;
    next();
  } catch {
    // Invalid or expired token – reject the connection with a clear error.
    next(new Error("Invalid or expired token"));
  }
});

io.on("connection", (socket) => {
  if (socket.data.user) {
    socket.user = socket.data.user;
    if (!socket.user._id && socket.user.id) {
      socket.user._id = socket.user.id;
    }
  }
  logger.info("Socket.IO client connected", { socketId: socket.id, userId: socket.user?._id || socket.user?.id });

  if (socket.user && socket.user._id) {
    socket.join(`user:${socket.user._id}`);
  }

  socket.on("registerNotifications", ({ userId, hotelId, role } = {}) => {
    const u = socket.data.user;
    if (!u) return;

    const uRole = u.role?.toLowerCase();
    const reqRole = role?.toLowerCase();

    // Strict Role & Ownership Enforcement for Rooms
    if (userId && (
      String(u.id).toLowerCase() === String(userId).toLowerCase() || 
      String(u.email || "").toLowerCase() === String(userId).toLowerCase() || 
      uRole === "admin" || 
      uRole === "super admin" || 
      uRole === "controller"
    )) {
      socket.join(roomNames.user(userId));
    }
    
    if (hotelId && (String(u.assignedHotelId) === String(hotelId) || String(u.hotelObjectId) === String(hotelId) || uRole === "admin" || uRole === "super admin" || uRole === "controller")) {
      socket.join(roomNames.hotel(hotelId));
    }
    
    if (reqRole && (uRole === reqRole || uRole === "admin" || uRole === "super admin" || uRole === "controller")) {
      socket.join(roomNames.role(reqRole));
    }
  });

  socket.on("disconnect", () => {
    logger.info("Socket.IO client disconnected", { socketId: socket.id });
  });

  socket.on("error", (err) => {
    logger.warn("Socket.IO error", { socketId: socket.id, error: err.message });
  });
});

app.set("io", io);
setNotificationIo(io);

// Attach WebSocket server for real-time visitor tracking
const wss = initWebSocket();

httpServer.on("upgrade", (request, socket, head) => {
  const pathname = new URL(request.url, "http://localhost").pathname;
  if (pathname.startsWith("/ws")) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  }
  // Socket.IO handles its own upgrade event for /socket.io/
});

if (process.env.NODE_ENV !== "test") {
  httpServer.listen(PORT, "0.0.0.0", () => {
    logger.info(`AthithiGriha API running on port ${PORT}`, {
      port:        PORT,
      environment: process.env.NODE_ENV,
    });
  });
}

// ── Graceful shutdown ─────────────────────────────────────
const shutdown = async (signal) => {
  logger.info(`${signal} received — shutting down gracefully`);
  httpServer.close(async () => {
    try {
      const mongoose = (await import("mongoose")).default;
      await mongoose.connection.close();
      logger.info("MongoDB connection closed");
    } catch {}
    process.exit(0);
  });

  // Force exit after 10s if graceful shutdown hangs
  setTimeout(() => {
    logger.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10_000);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));

// ── Unhandled rejections / exceptions ────────────────────
process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled Promise Rejection", { reason: String(reason) });
});
process.on("uncaughtException", (err) => {
  logger.error("Uncaught Exception", { error: err.message, stack: err.stack });
  process.exit(1);
});

export default app;
// Trigger restart after port clean
