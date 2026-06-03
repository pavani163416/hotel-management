import RoomType from "../models/RoomType.js";
import { logAudit } from "../utils/auditLogger.js";

// GET /api/room-types
export const getRoomTypes = async (req, res, next) => {
  try {
    const types = await RoomType.find({});
    res.status(200).json({ success: true, count: types.length, data: types });
  } catch (error) {
    next(error);
  }
};

// POST /api/room-types (Admin only)
export const createRoomType = async (req, res, next) => {
  try {
    const { code, name } = req.body;
    if (!code || !name) {
      return res.status(400).json({ success: false, message: "code and name are required" });
    }

    const exists = await RoomType.findOne({ code: code.toLowerCase().trim() });
    if (exists) {
      return res.status(400).json({ success: false, message: "Room type code already exists" });
    }

    const type = await RoomType.create({
      code: code.toLowerCase().trim(),
      name: name.trim(),
    });

    logAudit({
      req,
      action: "CREATE_ROOM_TYPE",
      details: { code: type.code, name: type.name },
    });

    res.status(201).json({ success: true, data: type });
  } catch (error) {
    next(error);
  }
};

// PATCH /api/room-types/:id (Admin only)
export const updateRoomType = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, active } = req.body;

    const type = await RoomType.findById(id);
    if (!type) {
      return res.status(404).json({ success: false, message: "Room type not found" });
    }

    if (name !== undefined) type.name = name.trim();
    if (active !== undefined) type.active = active;

    await type.save();

    logAudit({
      req,
      action: "UPDATE_ROOM_TYPE",
      details: { id, name: type.name, active: type.active },
    });

    res.status(200).json({ success: true, data: type });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/room-types/:id (Admin only)
export const deleteRoomType = async (req, res, next) => {
  try {
    const { id } = req.params;

    const type = await RoomType.findByIdAndDelete(id);
    if (!type) {
      return res.status(404).json({ success: false, message: "Room type not found" });
    }

    logAudit({
      req,
      action: "DELETE_ROOM_TYPE",
      details: { id, code: type.code },
    });

    res.status(200).json({ success: true, message: "Room type deleted successfully" });
  } catch (error) {
    next(error);
  }
};
