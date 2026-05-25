/**
 * WebSocket server for real-time visitor tracking AND booking updates
 * - User panel connects and sends page visit events
 * - Admin panel connects and receives live visitor + booking updates
 */
import { WebSocketServer } from "ws";
import Visitor from "../models/Visitor.js";

// Track connected admin clients
const adminClients = new Set();

// Broadcast a visitor event to all connected admin panels
const broadcastVisitor = (visitor) => {
  const msg = JSON.stringify({ type: "visitor_update", data: visitor });
  adminClients.forEach((ws) => {
    try { if (ws.readyState === 1) ws.send(msg); } catch { adminClients.delete(ws); }
  });
};

export const broadcastBookingUpdate = (booking) => {
  const msg = JSON.stringify({ type: "booking_update", data: booking });
  adminClients.forEach((ws) => {
    try { if (ws.readyState === 1) ws.send(msg); } catch { adminClients.delete(ws); }
  });
};

// Broadcast a room status change to all connected admin panels
export const broadcastRoomUpdate = (room) => {
  const msg = JSON.stringify({ type: "room_update", data: room });
  adminClients.forEach((ws) => {
    try { if (ws.readyState === 1) ws.send(msg); } catch { adminClients.delete(ws); }
  });
};

export const initWebSocket = () => {
  const wss = new WebSocketServer({ noServer: true, path: "/ws" });

  wss.on("connection", (ws, req) => {
    const role = new URL(req.url, "http://localhost").searchParams.get("role");

    if (role === "admin") {
      // Admin panel connected — add to broadcast list
      adminClients.add(ws);

      // Send current visitor list immediately on connect
      Visitor.find().sort({ createdAt: -1 }).limit(100)
        .then((visitors) => {
          if (ws.readyState === 1) {
            ws.send(JSON.stringify({ type: "visitors_list", data: visitors }));
          }
        }).catch(() => {});

      ws.on("close", () => adminClients.delete(ws));
    }

    if (role === "user") {
      // User panel connected — handle tracking events
      ws.on("message", async (raw) => {
        try {
          const msg = JSON.parse(raw.toString());

          if (msg.type === "page_visit") {
            const ua = req.headers["user-agent"] || "";
            const ip =
              req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
              req.socket.remoteAddress ||
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

            // Send back the visitor ID so user panel can update duration later
            if (ws.readyState === 1) {
              ws.send(JSON.stringify({ type: "visit_ack", id: visitor._id }));
            }

            // Broadcast to all admin panels in real time
            broadcastVisitor(visitor);
          }

          if (msg.type === "page_leave") {
            // Update duration and status when user leaves
            if (msg.id) {
              const updated = await Visitor.findByIdAndUpdate(
                msg.id,
                { duration: msg.duration || 0, status: msg.status || "Active" },
                { new: true }
              );
              if (updated) broadcastVisitor(updated);
            }
          }

          if (msg.type === "convert") {
            // Mark session as converted (booking completed)
            if (msg.sessionId) {
              await Visitor.updateMany({ sessionId: msg.sessionId }, { status: "Converted" });
              // Broadcast updated visitors
              const updated = await Visitor.find({ sessionId: msg.sessionId });
              updated.forEach(broadcastVisitor);
            }
          }
        } catch { /* ignore malformed messages */ }
      });
    }
  });

  console.log("🔌  WebSocket server ready at ws://localhost/ws");
  return wss;
};
