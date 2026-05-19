import Hotel from "../models/Hotel.js";
import Room from "../models/Room.js";
import { broadcastHotels } from "../routes/sseRoutes.js";
import connectAdminDB from "../config/adminDb.js";
import HotelSnapshotModel from "../models/admin/HotelSnapshot.js";

// Lazy-load HotelSnapshot bound to admin connection
let _HotelSnapshot = null;
const getHotelSnapshot = async () => {
  if (_HotelSnapshot) return _HotelSnapshot;
  const conn = await connectAdminDB();
  _HotelSnapshot = HotelSnapshotModel(conn);
  return _HotelSnapshot;
};

// Sync hotel to controller DB snapshot (best-effort, never throws)
const syncSnapshot = async (hotel, extra = {}) => {
  try {
    const HotelSnapshot = await getHotelSnapshot();
    await HotelSnapshot.findOneAndUpdate(
      { hotelId: hotel.hotelId },
      {
        hotelId:        hotel.hotelId,
        name:           hotel.name,
        location:       hotel.location,
        city:           hotel.city,
        country:        extra.country || hotel.city?.toUpperCase() || "",
        totalRooms:     extra.totalRooms ?? hotel.rooms?.length ?? 0,
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

// Sync a room to controller DB room snapshots
const syncRoomSnapshot = async (hotelId, hotelName, room) => {
  try {
    const conn = await connectAdminDB();
    const RoomSnapshot = (await import("../models/admin/RoomSnapshot.js")).default(conn);
    await RoomSnapshot.findOneAndUpdate(
      { roomNumber: room.id },
      {
        roomNumber:    room.id,
        hotelId,
        hotelName,
        name:          room.name,
        type:          "Standard",
        pricePerNight: room.price,
        capacity:      room.capacity,
        bed:           room.bed,
        available:     room.available ?? 1,
        features:      room.features || [],
        status:        (room.available ?? 1) > 0 ? "Available" : "Booked",
      },
      { upsert: true, new: true, runValidators: false }
    );
  } catch {}
};

// Remove a room from controller DB room snapshots
const deleteRoomSnapshotByNumber = async (roomNumber) => {
  try {
    const conn = await connectAdminDB();
    const RoomSnapshot = (await import("../models/admin/RoomSnapshot.js")).default(conn);
    await RoomSnapshot.findOneAndDelete({ roomNumber });
  } catch {}
};

// GET /api/hotels
export const getHotels = async (req, res, next) => {
  try {
    const { city, minPrice, maxPrice } = req.query;
    const filter = { isActive: true };
    if (city) filter.city = new RegExp(city, "i");
    if (minPrice || maxPrice) {
      filter.pricePerNight = {};
      if (minPrice) filter.pricePerNight.$gte = Number(minPrice);
      if (maxPrice) filter.pricePerNight.$lte = Number(maxPrice);
    }
    const hotels = await Hotel.find(filter).sort({ pricePerNight: 1 });
    res.status(200).json({ success: true, count: hotels.length, data: hotels });
  } catch (error) {
    next(error);
  }
};

// GET /api/hotels/:id
export const getHotelById = async (req, res, next) => {
  try {
    const hotel = await Hotel.findOne({ hotelId: req.params.id, isActive: true });
    if (!hotel) return res.status(404).json({ success: false, message: "Hotel not found" });
    res.status(200).json({ success: true, data: hotel });
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
    hotel.reviewCount = (hotel.reviewCount || 0) + 1;
    const totalRating = (hotel.rating || 0) * ((hotel.reviewCount || 1) - 1) + numericRating;
    hotel.rating = Number((totalRating / hotel.reviewCount).toFixed(1));
    await hotel.save();

    broadcastHotels();
    res.status(201).json({ success: true, message: "Review added", data: hotel });
  } catch (error) {
    next(error);
  }
};

// POST /api/hotels (admin only)
export const createHotel = async (req, res, next) => {
  try {
    const hotel = await Hotel.create(req.body);
    // Sync to controller DB snapshot so admin panel stats stay in sync
    await syncSnapshot(hotel, {
      country:    req.body.country || "",
      totalRooms: req.body.totalRooms || 0,
      status:     hotel.isActive ? "Active" : "Inactive",
    });
    broadcastHotels();
    res.status(201).json({ success: true, message: "Hotel created", data: hotel });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/hotels/:id (admin only)
export const updateHotel = async (req, res, next) => {
  try {
    const hotel = await Hotel.findOneAndUpdate(
      { hotelId: req.params.id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!hotel) return res.status(404).json({ success: false, message: "Hotel not found" });
    // Keep controller snapshot in sync
    await syncSnapshot(hotel, {
      country:    req.body.country || "",
      totalRooms: req.body.totalRooms || hotel.rooms?.length || 0,
      status:     hotel.isActive ? "Active" : "Inactive",
    });
    broadcastHotels();
    res.status(200).json({ success: true, message: "Hotel updated", data: hotel });
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

    broadcastHotels();
    res.status(200).json({ success: true, message: "Room availability updated", data: hotel });
  } catch (error) {
    next(error);
  }
};
