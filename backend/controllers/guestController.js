import Guest from "../models/Guest.js";
import Booking from "../models/Booking.js";
import AdditionalGuest from "../models/AdditionalGuest.js";

// ─────────────────────────────────────────────────────────
// POST /api/guests  — admin creates a guest directly
// ─────────────────────────────────────────────────────────
export const createGuest = async (req, res, next) => {
  try {
    const { name, email, phone, city } = req.body;
    if (!name || !email) {
      return res.status(400).json({ success: false, message: "Name and email are required" });
    }
    const normalizedEmail = email.toLowerCase().trim();
    // Upsert — if guest already exists return existing record
    const existing = await Guest.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(200).json({ success: true, message: "Guest already exists", data: existing });
    }
    const guest = await Guest.create({ name, email: normalizedEmail, phone: phone || "", city: city || "" });
    res.status(201).json({ success: true, message: "Guest registered successfully", data: guest });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// GET /api/guests
// ─────────────────────────────────────────────────────────
export const getAllGuests = async (req, res, next) => {
  try {
    const guests = await Guest.find()
      .populate({
        path: "bookings",
        select: "status totalAmount checkIn checkOut hotelName room",
        populate: { path: "room", select: "roomNumber type" },
      })
      .sort({ createdAt: -1 });

    // Enrich guests that have no linked bookings via fallback email match
    const enriched = await Promise.all(guests.map(async (g) => {
      const json = g.toJSON();
      if (json.bookings && json.bookings.length > 0) return json;
      const fallbackBookings = await Booking.find({
        "guestSnapshot.email": g.email.toLowerCase(),
      })
        .select("status totalAmount checkIn checkOut hotelName room")
        .populate("room", "roomNumber type")
        .sort({ createdAt: -1 });
      if (fallbackBookings.length > 0) {
        json.bookings = fallbackBookings.map((b) => b.toJSON());
      }
      return json;
    }));

    // Return ALL guests (including those with no bookings)
    res.status(200).json({
      success: true,
      count: enriched.length,
      data: enriched,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// GET /api/guests/:id
// ─────────────────────────────────────────────────────────
export const getGuestById = async (req, res, next) => {
  try {
    const guest = await Guest.findById(req.params.id).populate({
      path: "bookings",
      populate: { path: "room", select: "roomNumber type images" },
    });

    if (!guest) {
      return res.status(404).json({ success: false, message: "Guest not found" });
    }

    let bookings = guest.bookings || [];

    // Fallback: if no linked bookings, find by guestSnapshot.email
    if (bookings.length === 0) {
      bookings = await Booking.find({ "guestSnapshot.email": guest.email.toLowerCase() })
        .populate("room", "roomNumber type images")
        .sort({ createdAt: -1 });
    }

    // Also fetch additional guests for each booking
    const additionalGuests = await AdditionalGuest.find({ leadGuestId: req.params.id });

    res.status(200).json({
      success: true,
      data: { ...guest.toJSON(), bookings, additionalGuests },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// GET /api/guests/additional?email=...
// Returns all additional guests (adults + children) for a lead guest
// ─────────────────────────────────────────────────────────
export const getAdditionalGuests = async (req, res, next) => {
  try {
    const { email, bookingId } = req.query;
    const filter = {};
    if (email) filter.leadGuestEmail = email;
    if (bookingId) filter.bookingId = bookingId;

    const records = await AdditionalGuest.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: records.length, data: records });
  } catch (error) {
    next(error);
  }
};
