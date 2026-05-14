import Room from "../models/Room.js";

// ─────────────────────────────────────────────────────────
// GET /api/rooms
// Returns all active rooms, optionally filtered by status/type
// ─────────────────────────────────────────────────────────
export const getRooms = async (req, res, next) => {
  try {
    const { status, type, minPrice, maxPrice } = req.query;

    const filter = { isActive: true };

    if (status) filter.status = status;
    if (type) filter.type = type;
    if (minPrice || maxPrice) {
      filter.pricePerNight = {};
      if (minPrice) filter.pricePerNight.$gte = Number(minPrice);
      if (maxPrice) filter.pricePerNight.$lte = Number(maxPrice);
    }

    const rooms = await Room.find(filter).sort({ pricePerNight: 1 });

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
// ─────────────────────────────────────────────────────────
export const createRoom = async (req, res, next) => {
  try {
    // Use upsert so re-adding the same room doesn't fail with duplicate key
    const room = await Room.findOneAndUpdate(
      { roomNumber: req.body.roomNumber },
      req.body,
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true }
    );

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

    const allowedStatuses = ["Available", "Booked", "Maintenance"];
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

    res.status(200).json({
      success: true,
      message: `Room status updated to "${status}"`,
      data: room,
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// DELETE /api/rooms/:id  (hard delete)
// ─────────────────────────────────────────────────────────
export const deleteRoom = async (req, res, next) => {
  try {
    const room = await Room.findByIdAndDelete(req.params.id);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Room deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
