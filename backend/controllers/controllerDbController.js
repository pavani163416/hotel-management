/**
 * Controller DB — all reads/writes go to the 'controller' database
 * Collections: adminusers, transactions, visitorlogs, hotelsnapshots
 */
import connectAdminDB from "../config/adminDb.js";
import AdminUserModel      from "../models/admin/AdminUser.js";
import TransactionModel    from "../models/admin/Transaction.js";
import VisitorLogModel     from "../models/admin/VisitorLog.js";
import HotelSnapshotModel  from "../models/admin/HotelSnapshot.js";
import RoomSnapshotModel   from "../models/admin/RoomSnapshot.js";

let AdminUser, Transaction, VisitorLog, HotelSnapshot, RoomSnapshot;

const getModels = async () => {
  if (AdminUser) return { AdminUser, Transaction, VisitorLog, HotelSnapshot, RoomSnapshot };
  const conn = await connectAdminDB();
  AdminUser     = AdminUserModel(conn);
  Transaction   = TransactionModel(conn);
  VisitorLog    = VisitorLogModel(conn);
  HotelSnapshot = HotelSnapshotModel(conn);
  RoomSnapshot  = RoomSnapshotModel(conn);
  return { AdminUser, Transaction, VisitorLog, HotelSnapshot, RoomSnapshot };
};

// ════════════════════════════════════════════════════════
// ADMIN USERS
// ════════════════════════════════════════════════════════
export const getAdminUsers = async (req, res, next) => {
  try {
    const { AdminUser } = await getModels();
    const users = await AdminUser.find({}, "-password").sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, data: users });
  } catch (e) { next(e); }
};

export const createAdminUser = async (req, res, next) => {
  try {
    const { AdminUser } = await getModels();
    const user = await AdminUser.create(req.body);
    const { password: _, ...safe } = user.toJSON();
    res.status(201).json({ success: true, data: safe });
  } catch (e) { next(e); }
};

export const updateAdminUser = async (req, res, next) => {
  try {
    const { AdminUser } = await getModels();
    const user = await AdminUser.findByIdAndUpdate(req.params.id, req.body, { new: true }).select("-password");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    res.json({ success: true, data: user });
  } catch (e) { next(e); }
};

// ════════════════════════════════════════════════════════
// TRANSACTIONS (payments)
// ════════════════════════════════════════════════════════
export const getTransactions = async (req, res, next) => {
  try {
    const { Transaction } = await getModels();
    const txns = await Transaction.find().sort({ createdAt: -1 }).limit(200);
    res.json({ success: true, count: txns.length, data: txns });
  } catch (e) { next(e); }
};

export const createTransaction = async (req, res, next) => {
  try {
    const { Transaction } = await getModels();
    const txn = await Transaction.create(req.body);
    res.status(201).json({ success: true, data: txn });
  } catch (e) { next(e); }
};

export const updateTransaction = async (req, res, next) => {
  try {
    const { Transaction } = await getModels();
    const txn = await Transaction.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!txn) return res.status(404).json({ success: false, message: "Transaction not found" });
    res.json({ success: true, data: txn });
  } catch (e) { next(e); }
};

// ════════════════════════════════════════════════════════
// VISITOR LOGS
// ════════════════════════════════════════════════════════
export const getVisitorLogs = async (req, res, next) => {
  try {
    const { VisitorLog } = await getModels();
    const logs = await VisitorLog.find().sort({ createdAt: -1 }).limit(200);
    res.json({ success: true, count: logs.length, data: logs });
  } catch (e) { next(e); }
};

export const createVisitorLog = async (req, res, next) => {
  try {
    const { VisitorLog } = await getModels();
    const log = await VisitorLog.create(req.body);
    res.status(201).json({ success: true, id: log._id });
  } catch (e) { next(e); }
};

export const updateVisitorLog = async (req, res, next) => {
  try {
    const { VisitorLog } = await getModels();
    // Visitor log IDs are MongoDB ObjectIds — validate before querying
    const { default: mongoose } = await import("mongoose");
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid visitor log id." });
    }
    const log = await VisitorLog.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!log) return res.status(404).json({ success: false, message: "Visitor log not found." });
    res.json({ success: true, data: log });
  } catch (e) { next(e); }
};

export const convertVisitorLog = async (req, res, next) => {
  try {
    const { VisitorLog } = await getModels();
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ success: false, message: "sessionId required" });
    await VisitorLog.updateMany({ sessionId }, { status: "Converted" });
    res.json({ success: true });
  } catch (e) { next(e); }
};

// ════════════════════════════════════════════════════════
// HOTEL SNAPSHOTS
// ════════════════════════════════════════════════════════
export const getHotelSnapshots = async (req, res, next) => {
  try {
    const { HotelSnapshot } = await getModels();
    const hotels = await HotelSnapshot.find().sort({ name: 1 });
    res.json({ success: true, count: hotels.length, data: hotels });
  } catch (e) { next(e); }
};

export const upsertHotelSnapshot = async (req, res, next) => {
  try {
    const { HotelSnapshot } = await getModels();
    const hotel = await HotelSnapshot.findOneAndUpdate(
      { hotelId: req.body.hotelId },
      req.body,
      { upsert: true, new: true }
    );
    res.json({ success: true, data: hotel });
  } catch (e) { next(e); }
};

export const deleteHotelSnapshot = async (req, res, next) => {
  try {
    const { HotelSnapshot } = await getModels();
    const deleted = await HotelSnapshot.findOneAndDelete({ hotelId: req.params.id });
    if (!deleted) return res.status(404).json({ success: false, message: "Hotel snapshot not found." });
    res.json({ success: true, message: "Hotel snapshot deleted." });
  } catch (e) { next(e); }
};

// ════════════════════════════════════════════════════════
// CONTROLLER DB STATS (for admin dashboard)
// ════════════════════════════════════════════════════════
export const getControllerStats = async (req, res, next) => {
  try {
    const { AdminUser, Transaction, VisitorLog, HotelSnapshot } = await getModels();
    const [adminUsers, transactions, visitors, hotels, revenue] = await Promise.all([
      AdminUser.countDocuments(),
      Transaction.countDocuments(),
      VisitorLog.countDocuments(),
      HotelSnapshot.countDocuments(),
      Transaction.aggregate([
        { $match: { status: "Paid" } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);
    res.json({
      success: true,
      data: {
        adminUsers,
        transactions,
        visitors,
        hotels,
        totalRevenue: revenue[0]?.total || 0,
      },
    });
  } catch (e) { next(e); }
};

// ════════════════════════════════════════════════════════
// ROOM SNAPSHOTS (controller.rooms)
// ════════════════════════════════════════════════════════
export const getRoomSnapshots = async (req, res, next) => {
  try {
    const { RoomSnapshot } = await getModels();
    const { hotelId } = req.query;
    const filter = hotelId ? { hotelId } : {};
    const rooms = await RoomSnapshot.find(filter).sort({ hotelId: 1, roomNumber: 1 });
    res.json({ success: true, count: rooms.length, data: rooms });
  } catch (e) { next(e); }
};

export const upsertRoomSnapshot = async (req, res, next) => {
  try {
    const { RoomSnapshot } = await getModels();
    const room = await RoomSnapshot.findOneAndUpdate(
      { roomNumber: req.body.roomNumber },
      req.body,
      { upsert: true, new: true, runValidators: false }
    );
    res.json({ success: true, data: room });
  } catch (e) { next(e); }
};

export const deleteRoomSnapshot = async (req, res, next) => {
  try {
    const { RoomSnapshot } = await getModels();
    const deleted = await RoomSnapshot.findOneAndDelete({ roomNumber: req.params.roomNumber });
    if (!deleted) return res.status(404).json({ success: false, message: "Room snapshot not found." });
    res.json({ success: true, message: "Room snapshot deleted." });
  } catch (e) { next(e); }
};
