import mongoose from "mongoose";
import Hotel from "../models/Hotel.js";
import Room from "../models/Room.js";
import Booking from "../models/Booking.js";
import FunctionHall from "../models/FunctionHall.js";
import { sendNotification } from "../utils/notificationService.js";
import { broadcastHotels } from "../routes/sseRoutes.js";
import connectAdminDB from "../config/adminDb.js";
import HotelSnapshotModel from "../models/admin/HotelSnapshot.js";
import { deleteRoomSnapshotByNumber, syncRoomSnapshot } from "../services/syncService.js";
import { cacheGet, cacheSet, cacheDel, buildCacheKey, invalidateAllCaches } from "../cache/redisCache.js";
import { CACHE_TTL } from "../config/constants.js";
import { generateRoomsForHotel, syncRoomsForHotel } from "../services/roomGenerationService.js";
import { getDynamicRoomsForHotel, getEnrichedHotelsData } from "../services/hotelService.js";

// Lazy-load HotelSnapshot bound to admin connection
let _HotelSnapshot = null;
const getHotelSnapshot = async () => {
  if (_HotelSnapshot) return _HotelSnapshot;
  const conn = await connectAdminDB();
  _HotelSnapshot = HotelSnapshotModel(conn);
  return _HotelSnapshot;
};

export const invalidateHotelCache = async () => {
  await invalidateAllCaches();
};

const getInventoryTotal = (roomInventory) => {
  if (!roomInventory) return 0;
  let total = 0;
  if (typeof roomInventory.values === "function") {
    for (const val of roomInventory.values()) {
      total += Number(val?.total) || 0;
    }
  } else {
    for (const key of Object.keys(roomInventory)) {
      total += Number(roomInventory[key]?.total) || 0;
    }
  }
  return total;
};

// Sync hotel to controller DB snapshot (best-effort, never throws)
const syncSnapshot = async (hotel, extra = {}) => {
  try {
    const HotelSnapshot = await getHotelSnapshot();
    const totalRooms = extra.totalRooms ?? (getInventoryTotal(hotel.roomInventory) || hotel.rooms?.length || 0);
    await HotelSnapshot.findOneAndUpdate(
      { hotelId: hotel.hotelId },
      {
        hotelId:        hotel.hotelId,
        name:           hotel.name,
        location:       hotel.location,
        city:           hotel.city,
        country:        extra.country || hotel.city?.toUpperCase() || "",
        totalRooms,
        activeBookings: extra.activeBookings ?? 0,
        ytdRevenue:     extra.ytdRevenue ?? 0,
        status:         hotel.isActive === false ? "Inactive" : (extra.status || "Active"),
        image:          hotel.image || "",
        subtitle:       hotel.description || "",
      },
      { upsert: true, new: true, runValidators: false }
    );
  } catch { /* never block main flow */ }
};

// GET /api/hotels
export const getHotels = async (req, res, next) => {
  try {
    const { city, minPrice, maxPrice } = req.query;
    const cacheKey = buildCacheKey("hotels", city || "all", minPrice || "", maxPrice || "");
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return res.status(200).json({ success: true, count: cached.length, data: cached, cached: true });
    }

    const enrichedHotels = await getEnrichedHotelsData(city, minPrice, maxPrice);

    await cacheSet(cacheKey, enrichedHotels, CACHE_TTL.HOTEL_STATS);
    res.status(200).json({ success: true, count: enrichedHotels.length, data: enrichedHotels });
  } catch (error) {
    next(error);
  }
};

const findHotelByIdentifier = async (identifier) => {
  if (!identifier) return null;
  let hotel = null;
  if (mongoose.Types.ObjectId.isValid(identifier)) {
    hotel = await Hotel.findById(identifier);
  }
  if (!hotel) {
    hotel = await Hotel.findOne({ hotelId: identifier, isActive: true });
  }
  return hotel;
};

// GET /api/hotels/:id
export const getHotelById = async (req, res, next) => {
  try {
    const cacheKey = buildCacheKey("hotel", req.params.id);
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return res.status(200).json({ success: true, data: cached, cached: true });
    }

    const hotel = await findHotelByIdentifier(req.params.id);
    if (!hotel) return res.status(404).json({ success: false, message: "Hotel not found" });

    const roomsArray = await getDynamicRoomsForHotel(hotel.hotelId);
    const enrichedHotel = {
      ...hotel.toObject(),
      rooms: roomsArray,
    };

    await cacheSet(cacheKey, enrichedHotel, CACHE_TTL.HOTEL_STATS);
    res.status(200).json({ success: true, data: enrichedHotel });
  } catch (error) {
    next(error);
  }
};

export const getHotelHalls = async (req, res, next) => {
  try {
    const hotel = await findHotelByIdentifier(req.params.id);
    if (!hotel) {
      return res.status(404).json({ success: false, message: "Hotel not found" });
    }

    const filter = { isActive: true, $or: [] };
    filter.$or.push({ hotelStringId: hotel.hotelId });
    if (hotel._id) filter.$or.push({ hotelId: hotel._id });

    const halls = await FunctionHall.find(filter).sort({ name: 1 }).lean();
    res.status(200).json({ success: true, count: halls.length, data: halls });
  } catch (error) {
    next(error);
  }
};

export const bookHotelHall = async (req, res, next) => {
  try {
    const hotel = await findHotelByIdentifier(req.params.id);
    if (!hotel) {
      return res.status(404).json({ success: false, message: "Hotel not found" });
    }

    const hall = await FunctionHall.findOne({
      _id: req.params.hallId,
      isActive: true,
      $or: [
        { hotelStringId: hotel.hotelId },
        { hotelId: hotel._id },
      ],
    });

    if (!hall) {
      return res.status(404).json({ success: false, message: "Function hall not found" });
    }

    const { eventName, date, startTime, endTime, capacity, notes } = req.body;
    if (!eventName || !date || !startTime || !endTime || !capacity) {
      return res.status(400).json({ success: false, message: "eventName, date, startTime, endTime and capacity are required" });
    }

    const normalizedDate = new Date(date);
    if (Number.isNaN(normalizedDate.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid event date" });
    }

    const timePattern = /^\d{2}:\d{2}$/;
    if (!timePattern.test(startTime) || !timePattern.test(endTime)) {
      return res.status(400).json({ success: false, message: "Start time and end time must be in HH:MM format" });
    }
    if (startTime >= endTime) {
      return res.status(400).json({ success: false, message: "End time must be after start time" });
    }

    const capacityValue = Number(capacity);
    if (!Number.isFinite(capacityValue) || capacityValue < 1) {
      return res.status(400).json({ success: false, message: "Capacity must be a positive number" });
    }
    if (capacityValue > hall.capacity) {
      return res.status(400).json({ success: false, message: `Capacity cannot exceed hall capacity of ${hall.capacity}` });
    }

    const bookingDate = normalizedDate.toISOString().slice(0, 10);
    const hasOverlap = (hall.bookings || []).some((existing) => {
      if (existing.status === "Cancelled") return false;
      const existingDate = new Date(existing.date).toISOString().slice(0, 10);
      if (existingDate !== bookingDate) return false;
      return startTime < existing.endTime && endTime > existing.startTime;
    });

    if (hasOverlap) {
      return res.status(409).json({
        success: false,
        message: "This hall is already booked for the selected date and time slot.",
        code: "HALL_SLOT_CONFLICT",
      });
    }

    const organizer = String(req.user?.name || req.user?.email || "Guest").trim();
    const bookingPayload = {
      eventName: String(eventName).trim(),
      organizer,
      date: normalizedDate,
      startTime,
      endTime,
      capacity: capacityValue,
      status: "Pending",
      notes: String(notes || "").trim(),
      bookedAt: new Date(),
    };

    hall.bookings.push(bookingPayload);
    await hall.save();

    await sendNotification({
      role: "manager",
      hotelId: hotel.hotelId || String(hotel._id),
      message: `New function hall booking request for ${hall.name} on ${bookingDate}.`,
      type: "booking",
    }).catch(() => {});

    res.status(201).json({ success: true, message: "Function hall booking request submitted", data: hall });
  } catch (error) {
    next(error);
  }
};

// POST /api/hotels/:id/reviews
export const addReviewToHotel = async (req, res, next) => {
  try {
    const { rating, comment } = req.body;
    if (!rating || !comment) {
      return res.status(422).json({ success: false, message: "Rating and review text are required." });
    }

    // Spam prevention link check
    const containsSpam = (text) => {
      const spamPatterns = [
        /https?:\/\/[^\s]+/i, // URLs
        /www\.[^\s]+/i,      // www links
        /\[url=([^\]]+)\]/i,  // BBCode url
        /<a\s+href=/i        // HTML links
      ];
      return spamPatterns.some(pattern => pattern.test(text));
    };

    if (containsSpam(comment)) {
      return res.status(400).json({
        success: false,
        message: "External links and spam content are not permitted in reviews."
      });
    }

    // Note: Captcha/security check removed for review submissions (UX improvement).

    // Require authentication before accepting a review.
    const userId   = req.user?._id || req.user?.id;
    const guestId  = req.user?.guestId;
    const userEmail = req.user?.email?.toLowerCase().trim();
    const author = String(req.user?.name || req.user?.fullName || userEmail?.split("@")[0] || "Guest").trim();

    if (!userId && !guestId && !userEmail) {
      return res.status(401).json({ success: false, message: "Authentication required to submit a review." });
    }

    const hotel = await Hotel.findOne({ hotelId: req.params.id, isActive: true });
    if (!hotel) {
      return res.status(404).json({ success: false, message: "Hotel not found" });
    }

    // One review per user per hotel, keyed by userId or email.
    const alreadyReviewed = hotel.reviews.some((r) =>
      (userId   && String(r.userId)    === String(userId)) ||
      (userEmail && String(r.userEmail || "").toLowerCase().trim() === userEmail)
    );
    if (alreadyReviewed) {
      return res.status(409).json({
        success: false,
        message: "You have already reviewed this hotel. You can edit your existing review.",
        code: "DUPLICATE_REVIEW",
      });
    }

    const numericRating = Math.max(1, Math.min(5, Number(rating)));
    const review = {
      author:    String(author).trim(),
      userId:    userId || null,
      userEmail: userEmail || null,
      rating:    numericRating,
      comment:   String(comment).trim().slice(0, 1000),
      date:      new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    };

    hotel.reviews.push(review);
    // Recompute rating and count directly from the reviews array — avoids drift
    hotel.reviewCount = hotel.reviews.length;
    const totalRating = hotel.reviews.reduce((sum, r) => sum + (r.rating || 0), 0);
    hotel.rating = Number((totalRating / hotel.reviewCount).toFixed(1));
    await hotel.save();

    await invalidateHotelCache();
    broadcastHotels();
    res.status(201).json({ success: true, message: "Review added", data: hotel });
  } catch (error) {
    next(error);
  }
};

// PUT /api/hotels/:id/reviews/:reviewId - edit own review
export const editReviewInHotel = async (req, res, next) => {
  try {
    const { rating, comment } = req.body;
    const userId    = req.user?._id || req.user?.id;
    const userEmail = req.user?.email?.toLowerCase().trim();

    const hotel = await Hotel.findOne({ hotelId: req.params.id, isActive: true });
    if (!hotel) return res.status(404).json({ success: false, message: "Hotel not found" });

    const review = hotel.reviews.id(req.params.reviewId);
    if (!review) return res.status(404).json({ success: false, message: "Review not found" });

    // Ownership check
    const isOwner =
      (userId    && String(review.userId)    === String(userId)) ||
      (userEmail && String(review.userEmail || "").toLowerCase().trim() === userEmail);
    if (!isOwner) {
      return res.status(403).json({ success: false, message: "You can only edit your own reviews." });
    }

    if (rating != null) review.rating = Math.max(1, Math.min(5, Number(rating)));
    if (comment != null) review.comment = String(comment).trim().slice(0, 1000);
    review.editedAt = new Date();

    // Recompute aggregate rating
    hotel.reviewCount = hotel.reviews.length;
    const totalRating = hotel.reviews.reduce((sum, r) => sum + (r.rating || 0), 0);
    hotel.rating = Number((totalRating / hotel.reviewCount).toFixed(1));
    await hotel.save();

    await invalidateHotelCache();
    broadcastHotels();
    res.status(200).json({ success: true, message: "Review updated", data: hotel });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/hotels/:id/reviews/:reviewId - delete own review
export const deleteReviewFromHotel = async (req, res, next) => {
  try {
    const userId    = req.user?._id || req.user?.id;
    const userEmail = req.user?.email?.toLowerCase().trim();

    const hotel = await Hotel.findOne({ hotelId: req.params.id, isActive: true });
    if (!hotel) return res.status(404).json({ success: false, message: "Hotel not found" });

    const review = hotel.reviews.id(req.params.reviewId);
    if (!review) return res.status(404).json({ success: false, message: "Review not found" });

    // Ownership check (admins can also delete)
    const isOwner =
      (userId    && String(review.userId)    === String(userId)) ||
      (userEmail && String(review.userEmail || "").toLowerCase().trim() === userEmail);
    const isAdmin = req.user?.role && ["admin", "Super Admin", "Controller"].includes(req.user.role);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: "You can only delete your own reviews." });
    }

    review.deleteOne();

    // Recompute aggregate rating
    hotel.reviewCount = hotel.reviews.length;
    if (hotel.reviewCount > 0) {
      const totalRating = hotel.reviews.reduce((sum, r) => sum + (r.rating || 0), 0);
      hotel.rating = Number((totalRating / hotel.reviewCount).toFixed(1));
    } else {
      hotel.rating = undefined;
    }
    await hotel.save();

    await invalidateHotelCache();
    broadcastHotels();
    res.status(200).json({ success: true, message: "Review deleted", data: hotel });
  } catch (error) {
    next(error);
  }
};


// POST /api/hotels (admin only)
export const createHotel = async (req, res, next) => {
  try {
    // Normalize activation status and numeric hotel metadata.
    if (typeof req.body.status === "string") {
      req.body.isActive = req.body.status.toLowerCase() === "active";
    }
    if (typeof req.body.isActive === "string") {
      req.body.isActive = req.body.isActive.toLowerCase() === "true";
    }

    if (req.body.floors != null) req.body.floors = Number(req.body.floors);
    if (req.body.roomsPerFloor != null) req.body.roomsPerFloor = Number(req.body.roomsPerFloor);
    if (req.body.pricePerNight != null) req.body.pricePerNight = Number(req.body.pricePerNight);
    if (req.body.totalRooms != null) req.body.totalRooms = Number(req.body.totalRooms);

    const hotel = await Hotel.create(req.body);
    
    // Auto-generate room documents from roomInventory
    await generateRoomsForHotel(hotel);

    // Sync to controller DB snapshot so admin panel stats stay in sync
    const totalRooms = getInventoryTotal(hotel.roomInventory);
    await syncSnapshot(hotel, {
      country:    req.body.country || "",
      totalRooms: totalRooms || 0,
      status:     hotel.isActive ? "Active" : "Inactive",
    });
    await invalidateHotelCache();
    broadcastHotels();
    res.status(201).json({ success: true, message: "Hotel created and rooms auto-generated", data: hotel });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/hotels/:id (admin only)
export const updateHotel = async (req, res, next) => {
  try {
    if (typeof req.body.status === "string") {
      req.body.isActive = req.body.status.toLowerCase() === "active";
    }
    if (typeof req.body.isActive === "string") {
      req.body.isActive = req.body.isActive.toLowerCase() === "true";
    }
    if (req.body.floors != null) req.body.floors = Number(req.body.floors);
    if (req.body.roomsPerFloor != null) req.body.roomsPerFloor = Number(req.body.roomsPerFloor);
    if (req.body.pricePerNight != null) req.body.pricePerNight = Number(req.body.pricePerNight);
    if (req.body.totalRooms != null) req.body.totalRooms = Number(req.body.totalRooms);

    const hotel = await Hotel.findOne({ hotelId: req.params.id });
    if (!hotel) return res.status(404).json({ success: false, message: "Hotel not found" });

    // Update the fields on the found hotel document
    Object.assign(hotel, req.body);

    // Sync room documents and validate inventory reduction safety
    try {
      await syncRoomsForHotel(hotel);
    } catch (syncErr) {
      return res.status(400).json({ success: false, message: syncErr.message });
    }

    await hotel.save();

    // Respond immediately — sync and cache invalidation are non-blocking background tasks
    res.status(200).json({ success: true, message: "Hotel updated", data: hotel });

    syncSnapshot(hotel, {
      country:    req.body.country || hotel.city?.toUpperCase() || "",
      totalRooms: getInventoryTotal(hotel.roomInventory) || hotel.rooms?.length || 0,
      status:     hotel.isActive ? "Active" : "Inactive",
    }).catch(() => {});
    invalidateHotelCache().catch(() => {});
    broadcastHotels();
  } catch (error) {
    next(error);
  }
};

// DELETE /api/hotels/:id — permanent hard delete by hotelId
export const deleteHotel = async (req, res, next) => {
  try {
    const hotel = await Hotel.findOneAndDelete({ hotelId: req.params.id });
    if (!hotel) return res.status(404).json({ success: false, message: "Hotel not found" });
    // Remove from controller snapshot too
    try {
      const HotelSnapshot = await getHotelSnapshot();
      await HotelSnapshot.findOneAndDelete({ hotelId: req.params.id });
    } catch {}
    
    // Auto-cleanup orphaned Rooms and Bookings when a Hotel is destroyed
    await Room.deleteMany({ $or: [{ hotelStringId: hotel.hotelId }, { hotelId: hotel._id }] }).catch(() => {});
    await Booking.deleteMany({ $or: [{ hotelStringId: hotel.hotelId }, { hotelId: hotel._id }] }).catch(() => {});

    await invalidateHotelCache();
    broadcastHotels();
    res.status(200).json({ success: true, message: "Hotel permanently deleted" });
  } catch (error) {
    next(error);
  }
};

// POST /api/hotels/:id/rooms — add a room to a hotel's embedded rooms array
export const addRoomToHotel = async (req, res, next) => {
  try {
    const hotel = await Hotel.findOneAndUpdate(
      { hotelId: req.params.id },
      { $push: { rooms: req.body } },
      { new: true, runValidators: true }
    );
    if (!hotel) return res.status(404).json({ success: false, message: "Hotel not found" });

    // Sync to controller DB room snapshots
    syncRoomSnapshot(req.params.id, hotel.name, req.body).catch(() => {});

    // ── Upsert into standalone Room collection so manager panel can see it ──
    const BED_TYPE_MAP = {
      "1 King Bed": "King", "2 King Beds": "King", "King": "King",
      "1 Queen Bed": "Queen", "Queen": "Queen",
      "2 Twin Beds": "Twin", "Twin": "Twin",
      "1 King Bed + Sofa": "King",
      "Single": "Single", "Double": "Double",
    };

    const roomId = req.body.id;
    if (roomId) {
      // Derive type from name or use explicit type if passed
      const nameLower = (req.body.name || "").toLowerCase();
      let type = req.body.type || "Standard";
      if (!req.body.type) {
        if (nameLower.includes("suite"))       type = "Suite";
        else if (nameLower.includes("deluxe")) type = "Deluxe";
        else if (nameLower.includes("penthouse")) type = "Penthouse";
        else if (nameLower.includes("villa"))  type = "Villa";
      }
      // Validate type against enum
      const validTypes = ["Deluxe", "Suite", "Standard", "Penthouse", "Villa"];
      if (!validTypes.includes(type)) type = "Standard";

      const bedRaw = req.body.bedType || req.body.bed || "King";
      const bedType = BED_TYPE_MAP[bedRaw] || "King";
      const floorNum = Math.max(1, Number(req.body.floor) || 1);

      Room.findOneAndUpdate(
        { roomNumber: roomId },
        {
          $setOnInsert: { roomNumber: roomId },
          $set: {
            type,
            description:   req.body.description || `${req.body.name} at ${hotel.name}`,
            pricePerNight: req.body.pricePerNight || req.body.price || 0,
            capacity:      req.body.capacity || 2,
            bedType,
            amenities:     req.body.features || [],
            status:        (req.body.available ?? 1) > 0 ? "Available" : "Booked",
            floor:         floorNum,
            isActive:      true,
            hotelStringId: req.params.id,
            hotelId:       hotel._id,
            roomTypeId:    roomId,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).catch((err) => {
        // Log but never block the response
        console.error("Standalone room upsert failed:", err.message);
      });
    }

    await invalidateHotelCache();
    broadcastHotels();
    res.status(201).json({ success: true, message: "Room added to hotel", data: hotel });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/hotels/:id/rooms/:roomId — remove a room from hotel's embedded rooms array
export const removeRoomFromHotel = async (req, res, next) => {
  try {
    const hotel = await Hotel.findOneAndUpdate(
      { hotelId: req.params.id },
      { $pull: { rooms: { id: req.params.roomId } } },
      { new: true }
    );
    if (!hotel) return res.status(404).json({ success: false, message: "Hotel not found" });

    // Remove from controller DB room snapshots
    deleteRoomSnapshotByNumber(req.params.roomId).catch(() => {});

    await invalidateHotelCache();
    broadcastHotels();
    res.status(200).json({ success: true, message: "Room removed from hotel", data: hotel });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/hotels/:id/rooms/:roomId — update embedded hotel room availability
export const updateRoomInHotel = async (req, res, next) => {
  try {
    const available = req.body.available;
    if (available === undefined || Number.isNaN(Number(available)) || Number(available) < 0) {
      return res.status(422).json({ success: false, message: "available must be a non-negative number." });
    }

    const hotel = await Hotel.findOneAndUpdate(
      { hotelId: req.params.id, "rooms.id": req.params.roomId },
      { $set: { "rooms.$.available": Number(available) } },
      { new: true, runValidators: true }
    );

    if (!hotel) {
      return res.status(404).json({ success: false, message: "Hotel or room not found" });
    }

    const updatedRoom = hotel.rooms.find((r) => r.id === req.params.roomId);
    if (updatedRoom) {
      syncRoomSnapshot(req.params.id, hotel.name, updatedRoom).catch(() => {});

      try {
        await Room.findOneAndUpdate(
          { roomNumber: req.params.roomId },
          { status: Number(available) > 0 ? "Available" : "Booked" },
          { new: true }
        );
      } catch {}
    }

    await invalidateHotelCache();
    broadcastHotels();
    res.status(200).json({ success: true, message: "Room availability updated", data: hotel });
  } catch (error) {
    next(error);
  }
};
