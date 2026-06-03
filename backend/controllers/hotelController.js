import Hotel from "../models/Hotel.js";
import Room from "../models/Room.js";
import Booking from "../models/Booking.js";
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

// GET /api/hotels/:id
export const getHotelById = async (req, res, next) => {
  try {
    const cacheKey = buildCacheKey("hotel", req.params.id);
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return res.status(200).json({ success: true, data: cached, cached: true });
    }

    const hotel = await Hotel.findOne({ hotelId: req.params.id, isActive: true });
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

// POST /api/hotels/:id/reviews
export const addReviewToHotel = async (req, res, next) => {
  try {
    const { author, rating, comment } = req.body;
    if (!author || !rating || !comment) {
      return res.status(422).json({ success: false, message: "author, rating and comment are required." });
    }

    const hotel = await Hotel.findOne({ hotelId: req.params.id, isActive: true });
    if (!hotel) {
      return res.status(404).json({ success: false, message: "Hotel not found" });
    }

    const numericRating = Number(rating);
    const review = {
      author: String(author).trim(),
      rating: numericRating,
      comment: String(comment).trim(),
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
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
