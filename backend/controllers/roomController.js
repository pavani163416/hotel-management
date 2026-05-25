import Room from "../models/Room.js";
import { getHotelMapOverview } from "../services/roomAllocationService.js";
import { cacheGet, cacheSet, cacheDel, buildCacheKey, invalidateAllCaches } from "../cache/redisCache.js";
import { CACHE_TTL } from "../config/constants.js";

const invalidateRoomCache = async () => {
  await invalidateAllCaches();
};

// ─────────────────────────────────────────────────────────
// GET /api/rooms
// Returns all active rooms, optionally filtered by status/type
// ─────────────────────────────────────────────────────────
export const getRooms = async (req, res, next) => {
  try {
    const cacheKey = buildCacheKey(
      "rooms",
      req.query.status || "all",
      req.query.type || "all",
      req.query.hotelStringId || "all",
      req.query.roomNumber || "all",
      req.query.minPrice || "",
      req.query.maxPrice || ""
    );

    const cached = await cacheGet(cacheKey);
    if (cached) {
      return res.status(200).json({ success: true, count: cached.length, data: cached, cached: true });
    }

    const { status, type, minPrice, maxPrice, roomNumber, hotelStringId } = req.query;

    const filter = { isActive: true };

    if (roomNumber)    filter.roomNumber    = String(roomNumber).trim();
    if (status)        filter.status        = status;
    if (type)          filter.type          = type;
    if (hotelStringId) filter.hotelStringId = String(hotelStringId).trim();
    if (minPrice || maxPrice) {
      filter.pricePerNight = {};
      if (minPrice) filter.pricePerNight.$gte = Number(minPrice);
      if (maxPrice) filter.pricePerNight.$lte = Number(maxPrice);
    }

    const rooms = await Room.find(filter).sort({ pricePerNight: 1 });
    await cacheSet(cacheKey, rooms, CACHE_TTL.ROOM_AVAILABILITY);

    res.status(200).json({
      success: true,
      count: rooms.length,
      data: rooms,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// GET /api/rooms/:id
// Returns a single room by ID
// ─────────────────────────────────────────────────────────
export const getRoomById = async (req, res, next) => {
  try {
    const room = await Room.findById(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    res.status(200).json({ success: true, data: room });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// POST /api/rooms
// Creates a new room or upserts if roomNumber already exists
// Accepts optional hotelStringId and hotelId to link room to a hotel
// ─────────────────────────────────────────────────────────
export const createRoom = async (req, res, next) => {
  try {
    const { roomNumber, hotelStringId, hotelId, ...rest } = req.body;

    if (req.user?.role === "Manager") {
      const managerHotelId = req.user.assignedHotelId;
      const managerHotelObjId = req.user.hotelObjectId;
      const isAuthorized = 
        (managerHotelId && hotelStringId === managerHotelId) ||
        (managerHotelObjId && hotelId === String(managerHotelObjId));
      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: You do not have management rights for this hotel."
        });
      }
    }

    const updateData = { ...rest };
    if (hotelStringId !== undefined) updateData.hotelStringId = hotelStringId;
    if (hotelId !== undefined)       updateData.hotelId       = hotelId;

    // Use upsert so re-adding the same room doesn't fail with duplicate key
    const room = await Room.findOneAndUpdate(
      { roomNumber },
      { ...updateData, roomNumber },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );

    await invalidateRoomCache();
    res.status(201).json({
      success: true,
      message: "Room saved successfully",
      data: room,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// PATCH /api/rooms/:id
// Updates room status (Available / Booked / Maintenance)
// ─────────────────────────────────────────────────────────
export const updateRoomStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    const allowedStatuses = ["Available", "Booked", "Maintenance", "Cleaning", "Blocked"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status must be one of: ${allowedStatuses.join(", ")}`,
      });
    }

    const room = await Room.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    );

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    await invalidateRoomCache();
    broadcastRoomUpdate(room);
    res.status(200).json({
      success: true,
      message: `Room status updated to "${status}"`,
      data: room,
    });
  } catch (error) {
    next(error);
  }
};

import { broadcastRoomUpdate } from "../routes/wsRoutes.js";

// ─────────────────────────────────────────────────────────
// PATCH /api/rooms/:id/cleaning
// Updates room cleaning status (Clean, Dirty, In Progress, Inspected)
// ─────────────────────────────────────────────────────────
export const updateRoomCleaningStatus = async (req, res, next) => {
  try {
    const { cleaningStatus } = req.body;
    const allowed = ["Clean", "Dirty", "In Progress", "Inspected"];
    if (!allowed.includes(cleaningStatus)) {
      return res.status(400).json({ success: false, message: `cleaningStatus must be one of: ${allowed.join(", ")}` });
    }

    const room = await Room.findByIdAndUpdate(
      req.params.id,
      { cleaningStatus },
      { new: true, runValidators: true }
    );

    if (!room) return res.status(404).json({ success: false, message: "Room not found" });

    await invalidateRoomCache();
    broadcastRoomUpdate(room);
    
    res.status(200).json({ success: true, message: `Room cleaning status updated to "${cleaningStatus}"`, data: room });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// PATCH /api/rooms/:id/maintenance
// Updates room maintenance status (None, Requested, In Progress, Completed)
// ─────────────────────────────────────────────────────────
export const updateRoomMaintenanceStatus = async (req, res, next) => {
  try {
    const { maintenanceStatus, blockedReason } = req.body;
    const allowed = ["None", "Requested", "In Progress", "Completed"];
    if (!allowed.includes(maintenanceStatus)) {
      return res.status(400).json({ success: false, message: `maintenanceStatus must be one of: ${allowed.join(", ")}` });
    }

    const updateData = { maintenanceStatus };
    if (blockedReason !== undefined) updateData.blockedReason = blockedReason;

    const room = await Room.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!room) return res.status(404).json({ success: false, message: "Room not found" });

    await invalidateRoomCache();
    broadcastRoomUpdate(room);
    res.status(200).json({ success: true, message: `Room maintenance status updated to "${maintenanceStatus}"`, data: room });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// DELETE /api/rooms/:id  (hard delete)
// ─────────────────────────────────────────────────────────
// GET /api/rooms/map-overview?hotelStringId=&date=YYYY-MM-DD
export const getMapOverview = async (req, res, next) => {
  try {
    const { hotelStringId, hotelId, date } = req.query;
    if (!hotelStringId && !hotelId) {
      return res.status(400).json({ success: false, message: "hotelStringId or hotelId required" });
    }

    if (req.user?.role === "Manager") {
      const managerHotelId = req.user.assignedHotelId;
      const managerHotelObjId = req.user.hotelObjectId;
      const isAuthorized = 
        (managerHotelId && hotelStringId === managerHotelId) ||
        (managerHotelObjId && hotelId === String(managerHotelObjId));
      if (!isAuthorized) {
        return res.status(403).json({
          success: false,
          message: "Unauthorized: You do not manage this hotel."
        });
      }
    }

    const overview = await getHotelMapOverview({
      hotelStringId,
      hotelObjectId: hotelId,
      date: date || new Date().toISOString().slice(0, 10),
    });
    res.status(200).json({ success: true, data: overview });
  } catch (error) {
    next(error);
  }
};

export const deleteRoom = async (req, res, next) => {
  try {
    const room = await Room.findByIdAndDelete(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    await invalidateRoomCache();
    res.status(200).json({
      success: true,
      message: "Room deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
