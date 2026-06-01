/**
 * managerController.js - Full multi-tenant manager backend
 * All endpoints are scoped to req.scopedHotelId / req.scopedHotelName
 */
import jwt        from "jsonwebtoken";
import bcrypt     from "bcryptjs";
import mongoose   from "mongoose";
import Manager   from "../models/Manager.js";
import AdminUser  from "../models/AdminUser.js";
import Booking    from "../models/Booking.js";
import Room       from "../models/Room.js";
import Guest      from "../models/Guest.js";
import Hotel      from "../models/Hotel.js";
import AdditionalGuest from "../models/AdditionalGuest.js";
import PriceRequest    from "../models/PriceRequest.js";
import FunctionHall    from "../models/FunctionHall.js";
import { sendNotification } from "../utils/notificationService.js";
import logger from "../utils/logger.js";
import {
  buildOverlapQuery,
  NON_BOOKABLE_STATUSES,
  syncRoomLegacyStatus,
  getHotelMapOverview,
} from "../services/roomAllocationService.js";

const normalizePhoneNumber = (phone) => {
  if (!phone) {
    throw new Error("Phone number is required.");
  }

  // Reject URLs/SSRF or any script/HTML payloads immediately
  if (phone.includes("http://") || phone.includes("https://") || phone.includes("<") || phone.includes(">")) {
    throw new Error("Invalid phone number format.");
  }

  const normalized = phone.trim().replace(/[\s()\-]/g, "");

  // Strict E.164 phone validation (starts with +, followed by 1-9, and 7 to 14 digits)
  const e164Regex = /^\+[1-9]\d{7,14}$/;
  if (!e164Regex.test(normalized)) {
    throw new Error("Phone number must be a valid E.164 number starting with + and contain 8 to 15 digits.");
  }

  // Reject premium-rate phone numbers
  const premiumRatePatterns = [
    /^\+449[0-8]/, // UK premium rate
    /^\+4470/,     // UK personal numbers (often abused/premium)
    /^\+1900/,     // US premium rate
    /^\+881/,      // Global Mobile Satellite System
    /^\+882/,      // International Networks
    /^\+888/,      // Disaster Relief
  ];

  for (const pattern of premiumRatePatterns) {
    if (pattern.test(normalized)) {
      throw new Error("Premium-rate numbers are not allowed.");
    }
  }

  return normalized;
};

const getSecret = () => {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("Server misconfiguration: JWT_SECRET missing");
  return s;
};
const JWT_EXPIRES = "8h";

const HOTEL_PREFIXES = { h1:"hdl", h2:"tas", h3:"cbr", h4:"apl", h5:"tgm", h6:"scs", h7:"swg" };

function esc(s) {
  return s.split("").map(function(ch) {
    return "\\^$.|?*+()[]{}-".indexOf(ch) >= 0 ? "\\" + ch : ch;
  }).join("");
}
function hotelScopeFilter(hotelId, hotelName, hotelObjectId) {
  const clauses = [];
  if (hotelId) clauses.push({ hotelStringId: new RegExp(`^${esc(hotelId)}$`, "i") });
  if (hotelObjectId) clauses.push({ hotelId: hotelObjectId });
  if (hotelName) clauses.push({ hotelName: new RegExp(esc(hotelName), "i") });
  if (clauses.length === 0) return {};
  return clauses.length === 1 ? clauses[0] : { $or: clauses };
}

function getHotelPrefix(id, name) {
  if (HOTEL_PREFIXES[id]) return HOTEL_PREFIXES[id];
  if (!name) return "room";
  const clean = name.toLowerCase().replace(/[^a-z0-9\s]/g, "");
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    const mainWord = words[0];
    if (mainWord.length >= 3) return mainWord.slice(0, 3);
    return words.map(w => w[0]).join("").slice(0, 4);
  }
  return clean.slice(0, 3);
}

function roomPrefixFilter(id, hotelObjectId) {
  if (!id && !hotelObjectId) return {};
  const prefix = HOTEL_PREFIXES[id];
  const clauses = [];
  if (id) clauses.push({ hotelStringId: new RegExp(`^${esc(id)}$`, "i") });
  if (hotelObjectId) clauses.push({ hotelId: hotelObjectId });
  if (prefix) clauses.push({ roomNumber: new RegExp("^" + prefix + "-", "i") });
  if (clauses.length === 0) return {};
  return clauses.length === 1 ? clauses[0] : { $or: clauses };
}

function bookingBelongsToManagerHotel(booking, manager) {
  if (!booking || !manager) return false;
  const assignedHotelId = String(manager.assignedHotelId || "").toLowerCase();
  const assignedHotelObjectId = String(manager.hotelObjectId || "").toLowerCase();
  if (assignedHotelId && String(booking.hotelStringId || "").toLowerCase() === assignedHotelId) return true;
  if (assignedHotelObjectId && String(booking.hotelId || "").toLowerCase() === assignedHotelObjectId) return true;
  const prefix = HOTEL_PREFIXES[assignedHotelId];
  const roomNumber = String(booking.room?.roomNumber || "").toLowerCase();
  if (prefix && roomNumber.startsWith(prefix + "-")) return true;
  return false;
}

// ── POST /api/manager/login ───────────────────────────────
export const managerLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success:false, message:"Email and password are required." });
    if (password.length > 72) return res.status(400).json({ success:false, message:"Password exceeds maximum allowed length." });
    const manager = await Manager.findOne({ email: email.toLowerCase().trim(), isActive: true });
    const DUMMY_HASH = "$2b$12$abcdefghijklmnopqrstuvwxyz12345678901234567890";
    if (!manager) {
      await bcrypt.compare(password, DUMMY_HASH);
      return res.status(401).json({ success:false, message:"Invalid credentials." });
    }
    const valid = manager.password.startsWith("$2")
      ? await bcrypt.compare(password, manager.password)
      : manager.password === password;
    if (!valid) return res.status(401).json({ success:false, message:"Invalid credentials." });

    // Auto-upgrade plaintext password to bcrypt on successful login
    if (!manager.password.startsWith("$2")) {
      manager.password = await bcrypt.hash(password, 12);
    }
    manager.lastLogin = new Date();
    await manager.save();
    logger.info("Manager login successful", { email: manager.email, hotelId: manager.assignedHotelId });
    const payload = {
      id: manager._id, name: manager.name, email: manager.email, role: manager.role,
      assignedHotelId: manager.assignedHotelId || null,
      assignedHotelName: manager.assignedHotelName || null,
      hotelObjectId: manager.hotelObjectId ? String(manager.hotelObjectId) : null,
    };
    const token = jwt.sign(payload, getSecret(), { expiresIn: JWT_EXPIRES });
    res.status(200).json({ success:true, message:"Login successful", data:{ ...payload, token } });
  } catch (err) { next(err); }
};

// ── GET /api/manager/dashboard ────────────────────────────
export const getManagerDashboard = async (req, res, next) => {
  try {
    const { scopedHotelId: hotelId, scopedHotelName: hotelName } = req;
    const hf = hotelScopeFilter(hotelId, hotelName, req.scopedHotelObjectId);
    const rf = { isActive:true, ...roomPrefixFilter(hotelId, req.scopedHotelObjectId) };
    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+1);
    const [rooms, totalBookings, todayBookings, revenueAgg, checkedIn] = await Promise.all([
      Room.find(rf),
      Booking.countDocuments(hf),
      Booking.countDocuments({ ...hf, createdAt:{ $gte:today, $lt:tomorrow } }),
      Booking.aggregate([
        { $match:{ ...hf, status:{ $in:["Confirmed","Completed","CheckedIn","CheckedOut"] } } },
        { $group:{ _id:null, total:{ $sum:"$totalAmount" } } },
      ]),
      Booking.countDocuments({ ...hf, status:"CheckedIn" }),
    ]);
    res.status(200).json({ success:true, data:{
      hotelId, hotelName,
      totalRooms: rooms.length,
      availableRooms: rooms.filter(r=>r.status==="Available").length,
      occupiedRooms: rooms.filter(r=>r.status==="Booked"||r.status==="CheckedIn").length,
      maintenanceRooms: rooms.filter(r=>r.status==="Maintenance").length,
      blockedRooms: rooms.filter(r=>r.status==="Blocked").length,
      totalBookings, todayBookings,
      currentlyCheckedIn: checkedIn,
      totalRevenue: revenueAgg[0]?.total || 0,
    }});
  } catch (err) { next(err); }
};

export const getManagerStats = getManagerDashboard;

// ── GET /api/manager/rooms ────────────────────────────────
export const getManagerRooms = async (req, res, next) => {
  try {
    const { status, type, minPrice, maxPrice } = req.query;
    const filter = { isActive:true, ...roomPrefixFilter(req.scopedHotelId, req.scopedHotelObjectId) };
    if (status) filter.status = status;
    if (type)   filter.type   = type;
    if (minPrice || maxPrice) {
      filter.pricePerNight = {};
      if (minPrice) filter.pricePerNight.$gte = Number(minPrice);
      if (maxPrice) filter.pricePerNight.$lte = Number(maxPrice);
    }
    const rooms = await Room.find(filter).sort({ pricePerNight:1 });
    res.status(200).json({ success:true, count:rooms.length, data:rooms });
  } catch (err) { next(err); }
};

// ── POST /api/manager/rooms ───────────────────────────────
export const createManagerRoom = async (req, res, next) => {
  try {
    const hotelId = req.scopedHotelId, hotelName = req.scopedHotelName;
    let { roomNumber, roomType, pricePerNight, capacity, description, amenities } = req.body;
    // Validate required fields
    if (!roomNumber) return res.status(400).json({ success: false, message: "roomNumber is required" });
    // Length constraints
    const MAX_ROOM_NUMBER_LENGTH = 15;
    if (roomNumber.length > MAX_ROOM_NUMBER_LENGTH) {
      return res.status(413).json({ success: false, message: `roomNumber exceeds maximum length of ${MAX_ROOM_NUMBER_LENGTH}` });
    }
    // Simple XSS/character whitelist (alphanum, dash, underscore, space)
    const ROOM_REGEX = /^[a-zA-Z0-9\-_\=\s]+$/;
    if (!ROOM_REGEX.test(roomNumber)) {
      return res.status(400).json({ success: false, message: "roomNumber contains invalid characters" });
    }
    // Prefix handling
    const prefix = getHotelPrefix(hotelId, hotelName);
    if (prefix && !roomNumber.toLowerCase().startsWith(prefix + "-")) {
      roomNumber = `${prefix}-${roomNumber}`;
    }
    // Duplicate check within this hotel
    const existingRoom = await Room.findOne({ roomNumber, hotelStringId: hotelId });
    if (existingRoom) {
      return res.status(409).json({ success: false, message: "Room number already exists for this hotel" });
    }
    // Whitelist allowed fields
    const allowed = { roomNumber, roomType, pricePerNight, capacity, description, amenities };
    const room = await Room.create({
      ...allowed,
      hotelStringId: hotelId,
      hotelId: req.scopedHotelObjectId || null,
    });
    if (hotelId) {
      Hotel.findOneAndUpdate({ hotelId }, { $push: { rooms: { id: roomNumber, name: roomType || "Room", price: pricePerNight, capacity: capacity || 2, bed: "King", available: 1, features: amenities || [] } } }, { new: true }).catch(() => {});
    }
    const io = req.app.get("io");
    if (io) io.emit("roomCreated", { roomId: room._id, roomNumber, hotelId, hotelName });
    res.status(201).json({ success: true, message: "Room created", data: room });
  } catch (err) { next(err); }
};

// ── PUT /api/manager/rooms/:id ────────────────────────────
export const updateManagerRoom = async (req, res, next) => {
  try {
    const hotelId = req.scopedHotelId;
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ success:false, message:"Room not found" });
    
    const prefix = HOTEL_PREFIXES[hotelId];
    const roomHotelId = String(room.hotelStringId || "").toLowerCase();
    const assignedHotelId = String(hotelId || "").toLowerCase();
    const isOwner = (roomHotelId && roomHotelId === assignedHotelId) || (prefix && room.roomNumber.toLowerCase().startsWith(prefix + "-"));
    if (!isOwner)
      return res.status(403).json({ success:false, message:"Unauthorized: You do not have management access to this property.", code:"HOTEL_ACCESS_DENIED" });
      
    const allowed = ["status","pricePerNight","amenities","description","bedType","capacity","floor","blockedReason","type"];
    const update = {};
    for (const f of allowed) { if (req.body[f] !== undefined) update[f] = req.body[f]; }
    if (update.status && update.status !== "Blocked") update.blockedReason = null;
    const updated = await Room.findByIdAndUpdate(req.params.id, update, { new:true, runValidators:true });
    const io = req.app.get("io");
    if (io) io.emit("roomStatusUpdate", { roomId:req.params.id, roomNumber:updated.roomNumber, status:updated.status, hotelId });
    res.status(200).json({ success:true, message:"Room updated", data:updated });
  } catch (err) { next(err); }
};

// ── DELETE /api/manager/rooms/:id ─────────────────────────
export const deleteManagerRoom = async (req, res, next) => {
  try {
    const hotelId = req.scopedHotelId;
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ success:false, message:"Room not found" });
    
    const prefix = HOTEL_PREFIXES[hotelId];
    const roomHotelId = String(room.hotelStringId || "").toLowerCase();
    const assignedHotelId = String(hotelId || "").toLowerCase();
    const isOwner = (roomHotelId && roomHotelId === assignedHotelId) || (prefix && room.roomNumber.toLowerCase().startsWith(prefix + "-"));
    if (!isOwner)
      return res.status(403).json({ success:false, message:"Unauthorized: You do not have management access to this property.", code:"HOTEL_ACCESS_DENIED" });
      
    await Room.findByIdAndUpdate(req.params.id, { isActive:false });
    res.status(200).json({ success:true, message:"Room deactivated successfully" });
  } catch (err) { next(err); }
};

// ── GET /api/manager/rooms/map-overview?date=YYYY-MM-DD ───
export const getManagerMapOverview = async (req, res, next) => {
  try {
    const overview = await getHotelMapOverview({
      hotelStringId: req.scopedHotelId,
      hotelObjectId: req.scopedHotelObjectId,
      date: req.query.date || new Date().toISOString().slice(0, 10),
    });
    res.status(200).json({ success: true, data: overview });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/manager/bookings ─────────────────────────────
export const getManagerBookings = async (req, res, next) => {
  try {
    const { status, guestEmail } = req.query;
    const filter = { ...hotelScopeFilter(req.scopedHotelId, req.scopedHotelName, req.scopedHotelObjectId) };
    if (status) filter.status = status;
    if (guestEmail) {
      const guest = await Guest.findOne({ email: guestEmail });
      if (guest) filter.guest = guest._id;
      else return res.status(200).json({ success:true, count:0, data:[] });
    }
    const bookings = await Booking.find(filter)
      .populate("room",  "roomNumber type pricePerNight images")
      .populate("guest", "name email phone")
      .sort({ createdAt:-1 });
    const data = bookings.map(b => ({ ...b.toJSON(), hotelName: b.hotelName || req.scopedHotelName || "LuxeStay" }));
    res.status(200).json({ success:true, count:data.length, data });
  } catch (err) { next(err); }
};

// ── PUT /api/manager/bookings/:id/checkin ─────────────────
export const checkInBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id).populate("guest", "email");
    if (!booking) return res.status(404).json({ success:false, message:"Booking not found" });
    if (req.manager?.role === "Manager" && !bookingBelongsToManagerHotel(booking, req.manager)) {
      return res.status(403).json({ success:false, message:"Unauthorized: This booking does not belong to your hotel.", code:"HOTEL_ACCESS_DENIED" });
    }
    if (booking.status === "Cancelled") return res.status(400).json({ success:false, message:"Cannot check in a cancelled booking" });
    if (booking.status === "CheckedIn") return res.status(400).json({ success:false, message:"Guest is already checked in" });
    if (booking.status === "CheckedOut") return res.status(409).json({ success:false, message:"Cannot check in a booking that has already been checked out", code:"INVALID_STATE_TRANSITION" });
    booking.status = "CheckedIn";
    booking.checkedInAt = new Date();
    await booking.save();
    const io = req.app.get("io");
    if (io) {
      io.emit("bookingCheckedIn", { bookingId: booking._id, hotelName: booking.hotelName });
      io.emit("roomStatusUpdate", { roomId: booking.room, hotelStringId: booking.hotelStringId });
    }
    sendNotification({
      userId: booking.guest?.email || booking.guestSnapshot?.email,
      role: "customer",
      message: "You have been checked in",
      type: "booking",
    }).catch(() => {});
    res.status(200).json({ success:true, message:"Guest checked in successfully", data:booking });
  } catch (err) { next(err); }
};

// ── PUT /api/manager/bookings/:id/checkout ────────────────
export const checkOutBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id).populate("guest", "email");
    if (!booking) return res.status(404).json({ success:false, message:"Booking not found" });
    if (req.manager?.role === "Manager" && !bookingBelongsToManagerHotel(booking, req.manager)) {
      return res.status(403).json({ success:false, message:"Unauthorized: This booking does not belong to your hotel.", code:"HOTEL_ACCESS_DENIED" });
    }
    if (booking.status !== "CheckedIn") return res.status(400).json({ success:false, message:"Guest must be checked in before checking out" });
    booking.status = "CheckedOut";
    booking.checkedOutAt = new Date();
    await booking.save();
    await syncRoomLegacyStatus(booking.room);
    const io = req.app.get("io");
    if (io) {
      io.emit("bookingCheckedOut", { bookingId: booking._id, hotelName: booking.hotelName });
      io.emit("roomStatusUpdate", { roomId: booking.room, hotelStringId: booking.hotelStringId });
    }
    sendNotification({
      userId: booking.guest?.email || booking.guestSnapshot?.email,
      role: "customer",
      message: "You have been checked out",
      type: "booking",
    }).catch(() => {});
    res.status(200).json({ success:true, message:"Guest checked out successfully", data:booking });
  } catch (err) { next(err); }
};

// ── POST /api/manager/bookings/walkin ─────────────────────
export const createWalkInBooking = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { roomId, guest: guestData, checkIn, checkOut, pricePerNight, subtotal, taxes=0, discount=0, paymentMethod="cash", specialRequests="" } = req.body;
    if (!roomId || !guestData?.name || !guestData?.email || !guestData?.phone || !checkIn || !checkOut)
      return res.status(400).json({ success:false, message:"roomId, guest (name/email/phone), checkIn, checkOut are required" });
    let room = mongoose.Types.ObjectId.isValid(roomId)
      ? await Room.findById(roomId).session(session)
      : await Room.findOne({ roomNumber:roomId, isActive:true }).session(session);
    if (!room) { await session.abortTransaction(); return res.status(404).json({ success:false, message:"Room not found" }); }
    const prefix = HOTEL_PREFIXES[req.scopedHotelId];
    if (prefix && !room.roomNumber.toLowerCase().startsWith(prefix + "-")) {
      await session.abortTransaction();
      return res.status(403).json({ success:false, message:"Room does not belong to your hotel", code:"HOTEL_ACCESS_DENIED" });
    }
    if (NON_BOOKABLE_STATUSES.includes(room.status)) {
      await session.abortTransaction();
      return res.status(409).json({ success: false, message: `Room is ${room.status} and cannot be booked` });
    }
    const walkOverlap = await Booking.findOne(
      buildOverlapQuery(checkIn, checkOut, { room: room._id })
    ).session(session);
    if (walkOverlap) {
      await session.abortTransaction();
      return res.status(409).json({
        success: false,
        message: `Room is already booked for these dates (until ${walkOverlap.checkOut.toISOString().slice(0, 10)})`,
        code: "ROOM_OVERLAP",
      });
    }
    let guest = await Guest.findOne({ email: guestData.email }).session(session);
    if (!guest) { [guest] = await Guest.create([{ name:guestData.name, email:guestData.email, phone:guestData.phone, city:guestData.city||"" }], { session }); }
    
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const msPerDay = 1000 * 60 * 60 * 24;
    const nights = Math.max(1, Math.ceil((checkOutDate - checkInDate) / msPerDay));
    const nightlyRate = room.pricePerNight;
    const calculatedTotal = nightlyRate * nights;
    const totalAmount = calculatedTotal + (taxes || 0) - (discount || 0);

    const [booking] = await Booking.create([{
      room: room._id, guest: guest._id,
      guestSnapshot: { name:guestData.name, email:guestData.email, phone:guestData.phone },
      checkIn: checkInDate, checkOut: checkOutDate,
      pricePerNight: nightlyRate,
      subtotal: calculatedTotal,
      taxes, discount, totalAmount, paymentMethod, specialRequests,
      hotelName: req.scopedHotelName || "",
      hotelStringId: req.scopedHotelId || null,
      hotelId: req.scopedHotelObjectId || null,
      status: "CheckedIn", checkedInAt: new Date(), isWalkIn: true,
    }], { session });
    await Guest.findByIdAndUpdate(guest._id, { $push:{ bookings:booking._id } }, { session });
    await session.commitTransaction();
    const populated = await Booking.findById(booking._id).populate("room","roomNumber type pricePerNight").populate("guest","name email phone");
    const io = req.app.get("io");
    if (io) io.emit("newBooking", { bookingId:booking._id, hotelName:req.scopedHotelName, userName:guestData.name, amount:totalAmount, roomType:room.type, status:"CheckedIn", isWalkIn:true, createdAt:new Date().toISOString() });
    res.status(201).json({ success:true, message:"Walk-in booking created and guest checked in", data:{ ...populated.toJSON(), bookingRef:populated.bookingRef } });
  } catch (err) { await session.abortTransaction(); next(err); }
  finally { session.endSession(); }
};

// ── GET /api/manager/guests ───────────────────────────────
export const getManagerGuests = async (req, res, next) => {
  try {
    const hf = hotelScopeFilter(req.scopedHotelId, req.scopedHotelName, req.scopedHotelObjectId);
    const bookings = await Booking.find(hf).select("guest").lean();
    const guestIds = [...new Set(bookings.map(b => b.guest?.toString()).filter(Boolean))];
    const guests = await Guest.find({ _id:{ $in:guestIds } })
      .populate({ path:"bookings", match:hf, select:"status totalAmount checkIn checkOut hotelName room", populate:{ path:"room", select:"roomNumber type" } })
      .sort({ createdAt:-1 });
    res.status(200).json({ success:true, count:guests.length, data:guests });
  } catch (err) { next(err); }
};

// ── GET /api/manager/guests/additional ───────────────────
export const getManagerAdditionalGuests = async (req, res, next) => {
  try {
    const { email, bookingId } = req.query;
    const filter = {};
    if (email)     filter.leadGuestEmail = email;
    if (bookingId) filter.bookingId      = bookingId;
    if (!bookingId) {
      const ids = (await Booking.find(hotelScopeFilter(req.scopedHotelId, req.scopedHotelName, req.scopedHotelObjectId)).select("_id").lean()).map(b => b._id);
      filter.bookingId = { $in: ids };
    }
    const records = await AdditionalGuest.find(filter).sort({ createdAt:-1 });
    res.status(200).json({ success:true, count:records.length, data:records });
  } catch (err) { next(err); }
};

// ── GET /api/manager/halls ────────────────────────────────
export const getManagerHalls = async (req, res, next) => {
  try {
    const filter = { isActive:true };
    const orClauses = [];
    if (req.scopedHotelId)       orClauses.push({ hotelStringId: req.scopedHotelId });
    if (req.scopedHotelObjectId) orClauses.push({ hotelId: req.scopedHotelObjectId });
    if (orClauses.length) filter.$or = orClauses;
    const halls = await FunctionHall.find(filter).sort({ name:1 });
    res.status(200).json({ success:true, count:halls.length, data:halls });
  } catch (err) { next(err); }
};

// ── POST /api/manager/halls ───────────────────────────────
export const createManagerHall = async (req, res, next) => {
  try {
    const hall = await FunctionHall.create({
      ...req.body,
      hotelStringId: req.scopedHotelId,
      hotelId: req.scopedHotelObjectId || null,
      hotelName: req.scopedHotelName,
    });
    res.status(201).json({ success:true, message:"Hall created", data:hall });
  } catch (err) { next(err); }
};

// ── PUT /api/manager/halls/:id ────────────────────────────
export const updateManagerHall = async (req, res, next) => {
  try {
    const hall = await FunctionHall.findById(req.params.id);
    if (!hall) return res.status(404).json({ success:false, message:"Hall not found" });
    if (hall.hotelStringId && hall.hotelStringId !== req.scopedHotelId)
      return res.status(403).json({ success:false, message:"Unauthorized: This hall does not belong to your hotel.", code:"HOTEL_ACCESS_DENIED" });
    if (req.body.booking) {
      hall.bookings.push(req.body.booking);
      await hall.save();
      return res.status(200).json({ success:true, message:"Event booked", data:hall });
    }
    const allowed = ["name","description","capacity","pricePerHour","pricePerDay","amenities","isActive"];
    const update = {};
    for (const f of allowed) { if (req.body[f] !== undefined) update[f] = req.body[f]; }
    const updated = await FunctionHall.findByIdAndUpdate(req.params.id, update, { new:true, runValidators:true });
    res.status(200).json({ success:true, message:"Hall updated", data:updated });
  } catch (err) { next(err); }
};

// ── POST /api/manager/price-requests ─────────────────────
export const createPriceRequest = async (req, res, next) => {
  try {
    const { roomId, requestedPrice, reason, effectiveDate } = req.body;
    if (!roomId || !requestedPrice) return res.status(400).json({ success:false, message:"roomId and requestedPrice are required" });
    const room = await Room.findById(roomId);
    if (!room) return res.status(404).json({ success:false, message:"Room not found" });
    const prefix = HOTEL_PREFIXES[req.scopedHotelId];
    if (prefix && !room.roomNumber.toLowerCase().startsWith(prefix + "-"))
      return res.status(403).json({ success:false, message:"Room does not belong to your hotel", code:"HOTEL_ACCESS_DENIED" });
    const existing = await PriceRequest.findOne({ roomId, status:"pending" });
    if (existing) return res.status(409).json({ success:false, message:"A pending price request already exists for this room" });
    const pr = await PriceRequest.create({
      hotelStringId: req.scopedHotelId,
      hotelId: req.scopedHotelObjectId || null,
      hotelName: req.scopedHotelName,
      roomId,
      roomNumber: room.roomNumber,
      createdBy: req.manager.id,
      createdByName: req.manager.name,
      currentPrice: room.pricePerNight,
      requestedPrice: Number(requestedPrice),
      reason: reason || "",
      effectiveDate: effectiveDate ? new Date(effectiveDate) : null,
    });
    sendNotification({
      role: "admin",
      message: "New price request submitted",
      type: "price",
    }).catch(() => {});
    res.status(201).json({ success:true, message:"Price request submitted", data:pr });
  } catch (err) { next(err); }
};

// ── GET /api/manager/price-requests ──────────────────────
export const getManagerPriceRequests = async (req, res, next) => {
  try {
    const filter = {};
    const orClauses = [];
    if (req.scopedHotelId)       orClauses.push({ hotelStringId: req.scopedHotelId });
    if (req.scopedHotelObjectId) orClauses.push({ hotelId: req.scopedHotelObjectId });
    if (orClauses.length) filter.$or = orClauses;
    if (req.query.status) filter.status = req.query.status;
    const requests = await PriceRequest.find(filter)
      .populate("roomId",    "roomNumber type pricePerNight")
      .populate("createdBy", "name email")
      .sort({ createdAt:-1 });
    res.status(200).json({ success:true, count:requests.length, data:requests });
  } catch (err) { next(err); }
};
