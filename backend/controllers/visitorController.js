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
    
    await cleanOldVisitors();

    res.status(201).json({ success: true, id: visitor._id });
  } catch (error) {
    next(error);
  }
};

export const cleanOldVisitors = async () => {
  try {
    const count = await Visitor.countDocuments();
    if (count > 200) {
      const oldestVisitors = await Visitor.find().sort({ createdAt: 1 }).limit(count - 200).select("_id");
      const idsToDelete = oldestVisitors.map(v => v._id);
      if (idsToDelete.length > 0) {
        await Visitor.deleteMany({ _id: { $in: idsToDelete } });
      }
    }
  } catch (err) {
    // ignore
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
    const { duration, status, sessionId } = body;
    
    const visitor = await Visitor.findById(req.params.id);
    if (!visitor) {
      return res.status(404).json({ success: false, message: "Visitor not found" });
    }

    // IDOR Protection: Verify the sessionId matches
    if (sessionId && visitor.sessionId && visitor.sessionId !== sessionId) {
      return res.status(403).json({ success: false, message: "Unauthorized visitor update" });
    }

    if (duration !== undefined) visitor.duration = duration;
    if (status) visitor.status = status;
    
    await visitor.save();
    
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
    const page = parseInt(req.query.page, 10) || 1;
    const limit = 10; // Enforce 10 visitors per page
    const skip = (page - 1) * limit;

    const query = {};
    if (req.query.status && req.query.status !== "All") {
      query.status = req.query.status;
    }
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, "i");
      query.$or = [
        { ip: searchRegex },
        { country: searchRegex },
        { city: searchRegex },
        { page: searchRegex },
      ];
    }

    const fetchLimit = limit;

    const [visitors, total, statsAgg] = await Promise.all([
      fetchLimit > 0
        ? Visitor.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(fetchLimit)
        : Promise.resolve([]),
      Visitor.countDocuments(query),
      Visitor.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            active: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$status", "Active"] },
                      { $gte: ["$updatedAt", new Date(Date.now() - 5 * 60 * 1000)] }
                    ]
                  },
                  1,
                  0
                ]
              }
            },
            converted: { $sum: { $cond: [{ $eq: ["$status", "Converted"] }, 1, 0] } },
            bounced: { $sum: { $cond: [{ $eq: ["$status", "Bounced"] }, 1, 0] } },
            totalDuration: { $sum: "$duration" },
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const stats = statsAgg[0] || { active: 0, converted: 0, bounced: 0, totalDuration: 0, count: 0 };
    const avgDuration = stats.count > 0 ? Math.round(stats.totalDuration / stats.count) : 0;

    const cappedTotal = total;

    res.status(200).json({
      success: true,
      count: visitors.length,
      total: cappedTotal,
      page,
      totalPages: Math.ceil(cappedTotal / limit),
      data: visitors,
      stats: {
        active: stats.active,
        converted: stats.converted,
        bounced: stats.bounced,
        avgDuration,
      }
    });
  } catch (error) {
    next(error);
  }
};
