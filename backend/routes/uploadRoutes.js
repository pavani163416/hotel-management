/**
 * @swagger
 * tags:
 *   - name: Uploads
 *     description: Image upload and email test endpoints
 * /api/upload/image:
 *   post:
 *     summary: Upload an image to Cloudinary
 *     tags: [Uploads]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UploadImageRequest'
 *     responses:
 *       200:
 *         description: Image uploaded successfully
 * /api/upload/test-email:
 *   get:
 *     summary: Send a test email through Resend
 *     tags: [Uploads]
 *     parameters:
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: email
 *     responses:
 *       200:
 *         description: Test email sent successfully
 * /api/upload/fix-hotel-names:
 *   get:
 *     summary: Fix old bookings with missing hotel names
 *     tags: [Uploads]
 *     responses:
 *       200:
 *         description: Hotel names fixed
 */
import express from "express";
import { uploadImage } from "../utils/cloudinary.js";
import { Resend } from "resend";

const router = express.Router();

// POST /api/upload/image
router.post("/image", async (req, res) => {
  try {
    const { image, folder } = req.body;
    if (!image) return res.status(400).json({ success: false, message: "No image provided" });
    const result = await uploadImage(image, folder || "hotels");
    res.json({ success: true, url: result.url, publicId: result.publicId });
  } catch (err) {
    console.error("[Upload] Error:", err.message);
    res.status(500).json({ success: false, message: err.message || "Upload failed" });
  }
});

// GET /api/upload/test-email?to=your@email.com
router.get("/test-email", async (req, res) => {
  const to = req.query.to || "addepallipavani4@gmail.com";
  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    const { data, error } = await resend.emails.send({
      from:    process.env.RESEND_FROM_EMAIL || "LuxeStay <onboarding@resend.dev>",
      to:      [to],
      subject: "LuxeStay — Email Test",
      html:    "<h1>Test email from LuxeStay</h1><p>If you see this, emails are working!</p>",
    });
    if (error) {
      console.error("📧 [Test] Resend error:", JSON.stringify(error));
      return res.status(400).json({ success: false, error });
    }
    console.log("📧 [Test] Resend success:", JSON.stringify(data));
    res.json({ success: true, data, message: `Email sent to ${to}. Check your inbox and spam folder.` });
  } catch (err) {
    console.error("📧 [Test] Exception:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/upload/fix-hotel-names — fixes old bookings with missing hotel names
router.get("/fix-hotel-names", async (req, res) => {
  try {
    const Booking = (await import("../models/Booking.js")).default;
    const Hotel   = (await import("../models/Hotel.js")).default;
    const Room    = (await import("../models/Room.js")).default;

    const bookings = await Booking.find({}).populate("room", "roomNumber type");

    const INITIALS = {
      hdl: "Hôtel de Lumière",   tas: "The Azure Skyline",      cbr: "Coral Bay Resort",
      apl: "Alpine Peak Lodge",  tgm: "The Grand Metropolitan", scs: "Santorini Cliff Suites",
      h1:  "Hôtel de Lumière",   h2:  "The Azure Skyline",      h3:  "Coral Bay Resort",
      h4:  "Alpine Peak Lodge",  h5:  "The Grand Metropolitan", h6:  "Santorini Cliff Suites",
    };

    // Build roomId → hotelName from embedded hotel rooms
    const hotels = await Hotel.find({}, "name rooms");
    const roomToHotel = {};
    hotels.forEach((h) => {
      h.rooms.forEach((r) => { if (r.id) roomToHotel[r.id] = h.name; });
    });

    // Also build from standalone rooms collection
    const standaloneRooms = await Room.find({}, "roomNumber");
    standaloneRooms.forEach((r) => {
      const prefix = r.roomNumber.split("-")[0]?.toLowerCase() || r.roomNumber.split("_")[0]?.toLowerCase();
      if (INITIALS[prefix]) roomToHotel[r.roomNumber] = INITIALS[prefix];
    });

    let fixed = 0;
    for (const b of bookings) {
      if (b.hotelName && b.hotelName !== "LuxeStay") continue; // already has a real name

      const roomNum = b.room?.roomNumber || "";
      const prefix  = roomNum.split("-")[0]?.toLowerCase() || roomNum.split("_")[0]?.toLowerCase();
      let name = INITIALS[prefix] || roomToHotel[roomNum];

      // For bookings where room ref is null (deleted room), try to find by price match
      if (!name && !b.room) {
        // Try to find the room by looking at the booking's pricePerNight in all hotels
        const matchingHotel = hotels.find((h) =>
          h.rooms.some((r) => r.price === b.pricePerNight)
        );
        if (matchingHotel) name = matchingHotel.name;
      }

      if (name) {
        await Booking.findByIdAndUpdate(b._id, { hotelName: name });
        fixed++;
        console.log(`Fixed: ${b._id} → "${name}"`);
      }
    }
    res.json({ success: true, message: `Fixed ${fixed} bookings. Total: ${bookings.length}.` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

// GET /api/upload/fix-seeded-bookings — fixes the 7 seeded bookings with no room ref
router.get("/fix-seeded-bookings", async (req, res) => {
  try {
    const Booking = (await import("../models/Booking.js")).default;

    // These are the seeded bookings from seedController.js — known hotel names from transactions
    const knownFixes = [
      { id: "69ef1f942686509052b9ff40", hotelName: "Hôtel de Lumière" },
      { id: "69ef1f942686509052b9ff41", hotelName: "The Azure Skyline" },
      { id: "69ef1f942686509052b9ff42", hotelName: "Coral Bay Resort" },
      { id: "69ef1f942686509052b9ff43", hotelName: "The Grand Metropolitan" },
      { id: "69ef1f942686509052b9ff44", hotelName: "Santorini Cliff Suites" },
      { id: "69ef1f942686509052b9ff45", hotelName: "Alpine Peak Lodge" },
      { id: "69ef43bb3f7b52cefbe2f801", hotelName: "Hôtel de Lumière" },
    ];

    let fixed = 0;
    for (const fix of knownFixes) {
      const result = await Booking.findByIdAndUpdate(fix.id, { hotelName: fix.hotelName });
      if (result) { fixed++; console.log(`Fixed seeded booking ${fix.id} → "${fix.hotelName}"`); }
    }
    res.json({ success: true, message: `Fixed ${fixed} seeded bookings.` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/upload/fix-seeded-room-types — fixes room type for seeded bookings
router.get("/fix-seeded-room-types", async (req, res) => {
  try {
    const Booking = (await import("../models/Booking.js")).default;
    const Room    = (await import("../models/Room.js")).default;

    // Match seeded bookings to their correct room types from seedController transactions
    const knownFixes = [
      { id: "69ef1f942686509052b9ff40", roomNumber: "hdl-101", type: "Deluxe" },
      { id: "69ef1f942686509052b9ff41", roomNumber: "tas-101", type: "Standard" },
      { id: "69ef1f942686509052b9ff42", roomNumber: "cbr-101", type: "Villa" },
      { id: "69ef1f942686509052b9ff43", roomNumber: "tgm-101", type: "Standard" },
      { id: "69ef1f942686509052b9ff44", roomNumber: "scs-101", type: "Suite" },
      { id: "69ef1f942686509052b9ff45", roomNumber: "apl-102", type: "Suite" },
      { id: "69ef43bb3f7b52cefbe2f801", roomNumber: "hdl-101", type: "Deluxe" },
    ];

    let fixed = 0;
    for (const fix of knownFixes) {
      // Find the actual room document
      const room = await Room.findOne({ roomNumber: fix.roomNumber });
      if (room) {
        await Booking.findByIdAndUpdate(fix.id, { room: room._id });
        fixed++;
      }
    }
    res.json({ success: true, message: `Fixed ${fixed} room references.` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
