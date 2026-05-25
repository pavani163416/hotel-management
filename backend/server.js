import "dotenv/config";
import express          from "express";
import cors             from "cors";
import helmet           from "helmet";
import morgan           from "morgan";
import mongoSanitize    from "express-mongo-sanitize";
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
import maintenanceRoutes from "./routes/maintenanceRoutes.js";
import errorHandler     from "./middleware/errorHandler.js";
import { apiLimiter, bookingLimiter, promoLimiter } from "./middleware/rateLimiter.js";
import { roomNames, setNotificationIo } from "./utils/notificationService.js";
import logger           from "./utils/logger.js";
import swaggerUi        from "swagger-ui-express";
import swaggerDocument  from "./swagger.js";

// ── Validate required env vars on startup ─────────────────
// ADMIN_EMAIL and ADMIN_PASSWORD are now stored in the controller DB.
// Only MONGO_URI and JWT_SECRET are strictly required at startup.
const REQUIRED_ENV = ["MONGO_URI", "JWT_SECRET"];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length) {
  logger.error(`Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

// ── Initialize Redis and session cache layer ──────────────
await initializeRedis();

// ── Connect to both databases ─────────────────────────────
connectDB();
connectAdminDB();

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
            },
          },
          { upsert: true, new: true }
        );
        synced++;
      }
    }
    if (synced) logger.info(`Startup sync: ensured ${synced} hotel room(s) in standalone collection`);
  } catch (err) {
    logger.warn("Startup room sync failed (non-blocking)", { error: err.message });
  }
}).catch(() => {});

const app = express();
app.disable("x-powered-by");

app.use(cookieParser());
app.use(createSessionMiddleware());

const isProd     = process.env.NODE_ENV === "production";
if (isProd) {
  app.set("trust proxy", true);
}

// ── CORS ─────────────────────────────────────────────────
const rawOrigins = (process.env.CLIENT_ORIGIN || "").split(",").map((o) => o.trim()).filter(Boolean);

// Always-allowed origins (Vercel deployments + local dev)
const allowedOrigins = [
  "https://hotel-mgnt.vercel.app",
  "https://luxestay-frontend.vercel.app",
  "https://luxestay-admin.vercel.app",
  "http://localhost:5173", "http://127.0.0.1:5173",
  "http://localhost:5174", "http://127.0.0.1:5174",
  "http://localhost:3000", "http://127.0.0.1:3000",
  "http://localhost:8080", "http://127.0.0.1:8080",
  "http://localhost:8082", "http://127.0.0.1:8082",
  "http://192.168.1.60:8080",
  "https://luxestay-fix-final-v2.loca.lt",
  ...rawOrigins,
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (Postman, curl, server-to-server)
    if (!origin || origin === "null" || origin === "undefined") return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Allow any localhost port for development (e.g., Flutter Web)
    if (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) return callback(null, true);
    // Allow any vercel.app subdomain for preview deployments
    if (origin.endsWith(".vercel.app")) return callback(null, true);
    callback(new Error("CORS not allowed: " + origin));
  },
  methods:        ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials:    true,
};

const socketCorsOrigin = (origin, callback) => {
  if (!origin || origin === "null" || origin === "undefined") return callback(null, true);
  if (allowedOrigins.includes(origin)) return callback(null, true);
  if (origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:")) return callback(null, true);
  if (origin.endsWith(".vercel.app")) return callback(null, true);
  callback(new Error("Socket.IO CORS not allowed: " + origin));
};

// Handle preflight for all routes FIRST — before any other middleware
app.options("*", cors(corsOptions));
app.use(cors(corsOptions));

// ── Swagger / API documentation ──────────────────────────
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.get(["/api/docs", "/api/docs/"], (req, res) => swaggerUi.setup(swaggerDocument)(req, res));
app.get("/api/docs.json", (req, res) => res.json(swaggerDocument));
app.get("/api/docs/swagger.json", (req, res) => res.json(swaggerDocument));
app.get("/api/search", getHotels);

// ── Additional headers for WebSocket support ──────────────
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");
  next();
});

// ── Security headers ──────────────────────────────────────
// CSP disabled — API server only, no HTML pages served.
// Frontends (Vercel) handle their own CSP.
app.use(helmet({
  hsts: isProd ? {
    maxAge:            31536000,
    includeSubDomains: true,
    preload:           true,
  } : false,
  noSniff:              true,
  frameguard:           { action: "deny" },
  hidePoweredBy:        true,
  xssFilter:            true,
  referrerPolicy:       { policy: "strict-origin-when-cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      scriptSrc: ["'none'"],
      styleSrc: ["'none'"],
      imgSrc: ["'none'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      formAction: ["'none'"],
      baseUri: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
}));

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

// ── Body parsing — limit payload size ────────────────────
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.text({ type: "text/plain" }));

// ── NoSQL injection sanitization ─────────────────────────
app.use(mongoSanitize());

// ── HTTP request logging ──────────────────────────────────
app.use(morgan(isProd ? "combined" : "dev", { stream: logger.stream }));

// ── Rate limiting ─────────────────────────────────────────
app.use("/api", apiLimiter);
// bookingLimiter is applied per-route in bookingRoutes.js (POST only)

// ── Health check ──────────────────────────────────────────
app.get("/", (req, res) => {
  res.status(200).json({
    success:     true,
    message:     "LuxeStay API is live",
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
    message:     "LuxeStay API is running",
    environment: process.env.NODE_ENV,
    redis:       isRedisReady() ? "connected" : "disconnected",
    socket:      "running",
    timestamp:   new Date().toISOString(),
  });
});

// ── API Routes ────────────────────────────────────────────
app.use("/api/rooms",         roomRoutes);
app.use("/api/bookings",      bookingRoutes);
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
app.use("/api/notifications", notificationRoutes);
app.use("/api/maintenance",   maintenanceRoutes);

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
  logger.info("Socket.IO client connected", { socketId: socket.id, userId: socket.data.user?.id });

  socket.on("registerNotifications", ({ userId, hotelId, role } = {}) => {
    const u = socket.data.user;
    if (!u) return;

    // Strict Role & Ownership Enforcement for Rooms
    if (userId && (u.id === userId || u.role === "admin" || u.role === "Super Admin")) {
      socket.join(roomNames.user(userId));
    }
    
    if (hotelId && (u.assignedHotelId === hotelId || u.hotelObjectId === hotelId || u.role === "admin" || u.role === "Super Admin")) {
      socket.join(roomNames.hotel(hotelId));
    }
    
    if (role && (u.role === role || u.role === "admin" || u.role === "Super Admin")) {
      socket.join(roomNames.role(role));
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

// ── Start server ──────────────────────────────────────────
httpServer.listen(PORT, "0.0.0.0", () => {
  logger.info(`LuxeStay API running on port ${PORT}`, {
    port:        PORT,
    environment: process.env.NODE_ENV,
  });
});

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
