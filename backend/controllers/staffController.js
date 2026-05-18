import jwt from "jsonwebtoken";
import Housekeeper from "../models/Housekeeper.js";
import Task from "../models/Task.js";
import Room from "../models/Room.js";

const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret";

// POST /api/staff/login
export const staffLogin = async (req, res, next) => {
  try {
    const { name, pin } = req.body;
    if (!name || !pin) return res.status(400).json({ success: false, message: "Name and PIN required" });

    const staff = await Housekeeper.findOne({ name, pin, isActive: true });
    if (!staff) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const token = jwt.sign(
      { id: staff._id, role: "Housekeeper", hotelStringId: staff.hotelStringId },
      JWT_SECRET,
      { expiresIn: "8h" }
    );

    res.status(200).json({
      success: true,
      token,
      data: {
        id: staff._id,
        name: staff.name,
        hotelStringId: staff.hotelStringId,
        hotelName: staff.hotelName,
      }
    });
  } catch (err) { next(err); }
};

// GET /api/staff/tasks
export const getStaffTasks = async (req, res, next) => {
  try {
    const tasks = await Task.find({ assignedTo: req.staff.id, status: { $ne: "Completed" } })
      .sort({ priority: 1, createdAt: -1 });
    res.status(200).json({ success: true, count: tasks.length, data: tasks });
  } catch (err) { next(err); }
};

// PUT /api/staff/tasks/:id/status
export const updateStaffTaskStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const task = await Task.findOne({ _id: req.params.id, assignedTo: req.staff.id });
    if (!task) return res.status(404).json({ success: false, message: "Task not found" });

    task.status = status;
    if (status === "Completed") task.completedAt = new Date();
    await task.save();

    // Release room if completed
    if (status === "Completed") {
      const roomDoc = await Room.findOne({ roomNumber: task.roomNumber, hotelStringId: req.staff.hotelStringId });
      if (roomDoc && roomDoc.status !== "Booked") {
        roomDoc.status = "Available";
        await roomDoc.save();
        const io = req.app.get("io");
        if (io) io.emit("roomStatusUpdate", { roomId: roomDoc._id, roomNumber: roomDoc.roomNumber, status: "Available", hotelId: req.staff.hotelStringId });
      }
    }

    res.status(200).json({ success: true, data: task });
  } catch (err) { next(err); }
};
