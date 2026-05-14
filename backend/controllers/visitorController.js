import Visitor from "../models/Visitor.js";

// ─────────────────────────────────────────────────────────
// POST /api/visitors/track
// Called by the user panel on every page load
// ─────────────────────────────────────────────────────────
export const trackVisitor = async (req, res, next) => {
  try {
    const {
      page, referrer, device, browser, os, duration, status, sessionId,
    } = req.body;

    // Get real IP — works behind proxies/Nginx too
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.headers["x-real-ip"] ||
      req.socket.remoteAddress ||
      "127.0.0.1";

    // Clean up loopback IPs for local dev
    const cleanIp = ip === "::1" || ip === "127.0.0.1" ? "localhost" : ip;

    // Simple UA parsing (no extra package needed)
    const ua = req.headers["user-agent"] || "";
    const detectedDevice = device || (
      /mobile/i.test(ua) ? "Mobile" :
      /tablet|ipad/i.test(ua) ? "Tablet" : "Desktop"
    );
    const detectedBrowser = browser || (
      /edg/i.test(ua) ? "Edge" :
      /chrome/i.test(ua) ? "Chrome" :
      /firefox/i.test(ua) ? "Firefox" :
      /safari/i.test(ua) ? "Safari" : "Other"
    );
    const detectedOs = os || (
      /windows/i.test(ua) ? "Windows" :
      /mac os/i.test(ua) ? "macOS" :
      /android/i.test(ua) ? "Android" :
      /iphone|ipad/i.test(ua) ? "iOS" :
      /linux/i.test(ua) ? "Linux" : "Other"
    );

    const visitor = await Visitor.create({
      ip: cleanIp,
      country: "Local",       // In production: use ip-api.com or similar
      countryCode: "LO",
      city: "Localhost",
      device: detectedDevice,
      browser: detectedBrowser,
      os: detectedOs,
      page: page || "/",
      referrer: referrer || req.headers.referer || "direct",
      duration: duration || 0,
      status: status || "Active",
      sessionId: sessionId || null,
    });

    res.status(201).json({ success: true, id: visitor._id });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// PATCH /api/visitors/:id
// Called when user leaves the page — updates duration + status
// Handles both application/json and text/plain (sendBeacon)
// ─────────────────────────────────────────────────────────
export const updateVisitor = async (req, res, next) => {
  try {
    // sendBeacon sends text/plain — parse manually if needed
    let body = req.body;
    if (typeof body === "string") {
      try { body = JSON.parse(body); } catch { body = {}; }
    }
    const { duration, status } = body;
    await Visitor.findByIdAndUpdate(req.params.id, {
      ...(duration !== undefined && { duration }),
      ...(status && { status }),
    });
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// PATCH /api/visitors/convert
// Called from confirmation page — marks all visits in this session as Converted
// ─────────────────────────────────────────────────────────
export const convertVisitor = async (req, res, next) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ success: false, message: "sessionId required" });
    await Visitor.updateMany({ sessionId }, { status: "Converted" });
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};
export const getVisitors = async (req, res, next) => {
  try {
    const visitors = await Visitor.find()
      .sort({ createdAt: -1 })
      .limit(200);

    res.status(200).json({
      success: true,
      count: visitors.length,
      data: visitors,
    });
  } catch (error) {
    next(error);
  }
};
