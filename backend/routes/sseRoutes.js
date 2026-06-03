/**
 * @swagger
 * tags:
 *   - name: SSE
 *     description: Server-Sent Events endpoints for hotel updates
 * /api/sse/hotels:
 *   get:
 *     summary: Subscribe to hotel updates via Server-Sent Events
 *     tags: [SSE]
 *     responses:
 *       200:
 *         description: SSE connection established
 */
/**
 * Server-Sent Events — pushes real-time hotel updates to the user panel
 * User panel connects once, backend pushes whenever hotels change
 */
import express from "express";
import { getEnrichedHotelsData } from "../services/hotelService.js";

const router = express.Router();

// All connected SSE clients
const clients = new Set();

// Push update to all connected clients
export const broadcastHotels = async () => {
  if (clients.size === 0) return;
  try {
    const hotels = await getEnrichedHotelsData();
    const data = JSON.stringify({ type: "hotels_updated", data: hotels });
    clients.forEach((res) => {
      try { res.write(`data: ${data}\n\n`); } catch { clients.delete(res); }
    });
  } catch {}
};

// GET /api/sse/hotels — user panel connects here
router.get("/hotels", (req, res) => {
  res.setHeader("Content-Type",  "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection",    "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  // Send current hotels enriched immediately on connect
  getEnrichedHotelsData().then((hotels) => {
    res.write(`data: ${JSON.stringify({ type: "hotels_updated", data: hotels })}\n\n`);
  }).catch(() => {});

  // Keep alive ping every 25s
  const ping = setInterval(() => {
    try { res.write(": ping\n\n"); } catch { clearInterval(ping); }
  }, 25000);

  clients.add(res);

  req.on("close", () => {
    clients.delete(res);
    clearInterval(ping);
  });
});

export default router;
