/**
 * Socket.IO server for real-time visitor tracking AND booking updates
 * - User panel connects and sends page visit events
 * - Admin panel connects and receives live visitor + booking updates
 */
import { WebSocketServer, WebSocket } from "ws";
import Visitor from "../models/Visitor.js";

let io = null;
let rawWss = null;
const rawAdminClients = new Set();

const sendWsEvent = (ws, event, payload) => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ event, payload }));
  }
};

const broadcastVisitorUpdate = (visitor) => {
  if (io) io.emit("visitor_update", visitor);
  rawAdminClients.forEach((ws) => sendWsEvent(ws, "visitor_update", visitor));
};

const broadcastNewBooking = (booking) => {
  if (io) {
    io.emit("booking_update", booking);
    io.emit("newBooking", {
      bookingId: booking._id,
      hotelName: booking.hotelName,
      userName: booking.guestSnapshot?.name || booking.guest?.name,
      amount: booking.totalAmount,
      roomType: booking.room?.type || booking.hotelName || "Room",
      status: booking.status,
      createdAt: booking.createdAt,
    });
  }
};

const handleRawVisitorMessage = async (ws, msg) => {
  try {
    const data = typeof msg === "string" ? JSON.parse(msg) : JSON.parse(msg.toString());
    if (!data?.event) return;

    if (data.event === "page_visit") {
      const payload = data.payload || {};
      const ua = ws._socket?.remoteAddress ? String(ws._socket.remoteAddress) : "";
      const visitor = await Visitor.create({
        ip:          payload.ip || "127.0.0.1",
        country:     payload.country || "Unknown",
        countryCode: payload.countryCode || "XX",
        city:        payload.city || "Unknown",
        device:      payload.device || "Unknown",
        browser:     payload.browser || "Other",
        os:          payload.os || "Other",
        page:        payload.page || "/",
        referrer:    payload.referrer || "direct",
        duration:    0,
        status:      "Active",
        sessionId:   payload.sessionId || null,
      });

      sendWsEvent(ws, "visit_ack", { id: visitor._id });
      broadcastVisitorUpdate(visitor);
      return;
    }

    if (data.event === "page_leave") {
      const payload = data.payload || {};
      if (!payload.id) return;
      const updated = await Visitor.findByIdAndUpdate(
        payload.id,
        { duration: payload.duration || 0, status: payload.status || "Active" },
        { new: true }
      );
      if (updated) broadcastVisitorUpdate(updated);
      return;
    }

    if (data.event === "convert") {
      const payload = data.payload || {};
      if (!payload.sessionId) return;
      await Visitor.updateMany({ sessionId: payload.sessionId }, { status: "Converted" });
      const updated = await Visitor.find({ sessionId: payload.sessionId });
      updated.forEach((visitor) => broadcastVisitorUpdate(visitor));
      return;
    }
  } catch (error) {
    console.warn("Raw WebSocket message handling failed", error?.message || error);
  }
};

export const setBookingIo = (socketServer) => {
  io = socketServer;

  // Handle Socket.IO connections for visitor tracking and admin updates
  io.on("connection", async (socket) => {
    console.log("Socket.IO client connected:", socket.id);

    // Send current visitor list immediately on connect to admin
    try {
      const visitors = await Visitor.find().sort({ createdAt: -1 }).limit(100);
      socket.emit("visitors_list", visitors);
    } catch {}

    // Handle user tracking events
    socket.on("page_visit", async (msg) => {
      try {
        const ua = socket.handshake.headers["user-agent"] || "";
        const ip =
          socket.handshake.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
          socket.handshake.address ||
          "127.0.0.1";
        const cleanIp = ip === "::1" || ip === "127.0.0.1" ? "localhost" : ip;

        const visitor = await Visitor.create({
          ip:          cleanIp,
          country:     msg.country     || "Unknown",
          countryCode: msg.countryCode || "XX",
          city:        msg.city        || "Unknown",
          device:      msg.device      || (/mobile/i.test(ua) ? "Mobile" : /tablet|ipad/i.test(ua) ? "Tablet" : "Desktop"),
          browser:     msg.browser     || (/edg/i.test(ua) ? "Edge" : /chrome/i.test(ua) ? "Chrome" : /firefox/i.test(ua) ? "Firefox" : /safari/i.test(ua) ? "Safari" : "Other"),
          os:          msg.os          || (/windows/i.test(ua) ? "Windows" : /mac os/i.test(ua) ? "macOS" : /android/i.test(ua) ? "Android" : /iphone|ipad/i.test(ua) ? "iOS" : "Other"),
          page:        msg.page        || "/",
          referrer:    msg.referrer    || "direct",
          duration:    0,
          status:      "Active",
          sessionId:   msg.sessionId   || null,
        });

        // Send back the visitor ID
        socket.emit("visit_ack", { id: visitor._id });

        // Broadcast to all admin panels
        broadcastVisitorUpdate(visitor);
      } catch {}
    });

    socket.on("page_leave", async (msg) => {
      try {
        if (msg.id) {
          const updated = await Visitor.findByIdAndUpdate(
            msg.id,
            { duration: msg.duration || 0, status: msg.status || "Active" },
            { new: true }
          );
          if (updated) {
            broadcastVisitorUpdate(updated);
          }
        }
      } catch {}
    });

    socket.on("convert", async (msg) => {
      try {
        if (msg.sessionId) {
          await Visitor.updateMany({ sessionId: msg.sessionId }, { status: "Converted" });
          const updated = await Visitor.find({ sessionId: msg.sessionId });
          updated.forEach((visitor) => broadcastVisitorUpdate(visitor));
        }
      } catch {}
    });

    socket.on("disconnect", () => {
      console.log("Socket.IO client disconnected:", socket.id);
    });
  });
};

// Attach a raw WebSocket server at /ws for legacy clients and health checks
export const initRawWebSocket = (httpServer) => {
  if (rawWss) return rawWss;

  rawWss = new WebSocketServer({ noServer: true });

  httpServer.on("upgrade", (req, socket, head) => {
    const requestUrl = new URL(req.url, `http://${req.headers.host}`);
    if (requestUrl.pathname !== "/ws") return;
    rawWss.handleUpgrade(req, socket, head, (ws) => rawWss.emit("connection", ws, req));
  });

  rawWss.on("connection", async (ws, req) => {
    const requestUrl = new URL(req.url, `http://${req.headers.host}`);
    const role = requestUrl.searchParams.get("role") || "user";
    if (role === "admin") rawAdminClients.add(ws);

    console.log("Raw WebSocket client connected:", { role });

    if (role === "admin") {
      try {
        const visitors = await Visitor.find().sort({ createdAt: -1 }).limit(100);
        sendWsEvent(ws, "visitors_list", visitors);
      } catch {}
    } else {
      sendWsEvent(ws, "connected", { role });
    }

    ws.on("message", async (msg) => {
      await handleRawVisitorMessage(ws, msg);
    });

    const cleanup = () => {
      if (role === "admin") rawAdminClients.delete(ws);
    };

    ws.on("close", cleanup);
    ws.on("error", cleanup);
  });

  return rawWss;
};

// Broadcast a booking status change to all connected admin panels via Socket.IO
export const broadcastBookingUpdate = (booking) => {
  console.log("broadcastBookingUpdate called with booking:", booking);
  if (io) {
    console.log("Emitting booking_update and newBooking via Socket.IO");
    io.emit("booking_update", booking);
    io.emit("newBooking", {
      bookingId: booking._id,
      hotelName: booking.hotelName,
      userName: booking.guestSnapshot?.name || booking.guest?.name,
      amount: booking.totalAmount,
      roomType: booking.room?.type || booking.hotelName || "Room",
      status: booking.status,
      createdAt: booking.createdAt,
    });
  }

  rawAdminClients.forEach((ws) => {
    sendWsEvent(ws, "booking_update", booking);
    sendWsEvent(ws, "newBooking", {
      bookingId: booking._id,
      hotelName: booking.hotelName,
      userName: booking.guestSnapshot?.name || booking.guest?.name,
      amount: booking.totalAmount,
      roomType: booking.room?.type || booking.hotelName || "Room",
      status: booking.status,
      createdAt: booking.createdAt,
    });
  });

  if (!io && rawAdminClients.size === 0) {
    console.log("Socket.IO and raw WebSocket admin clients are not initialized yet");
  }
};

export const initWebSocket = () => {
  console.log("🔌  Socket.IO server ready");
  return io;
};
