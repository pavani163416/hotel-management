import { writeFileSync } from 'fs';

const content = `/**
 * managerController.js - Full multi-tenant manager backend
 * All endpoints are scoped to req.scopedHotelId / req.scopedHotelName
 */
import jwt        from "jsonwebtoken";
import bcrypt     from "bcryptjs";
import mongoose   from "mongoose";
import AdminUser  from "../models/AdminUser.js";
import Booking    from "../models/Booking.js";
import Room       from "../models/Room.js";
import Guest      from "../models/Guest.js";
import Hotel      from "../models/Hotel.js";
import AdditionalGuest from "../models/AdditionalGuest.js";
import PriceRequest    from "../models/PriceRequest.js";
import FunctionHall    from "../models/FunctionHall.js";

const JWT_SECRET = process.env.JWT_SECRET || "luxestay_manager_secret_2024";
const JWT_EXPIRES = "7d";

const HOTEL_PREFIXES = { h1:"hdl", h2:"tas", h3:"cbr", h4:"apl", h5:"tgm", h6:"scs", h7:"swg" };

function esc(s) { return s.replace(/[-.*+?^$|()[\]{}\\]/g, "\\$&"); }
function hotelNameFilter(n) { return n ? { hotelName: new RegExp(esc(n), "i") } : {}; }
function roomPrefixFilter(id) { return (id && HOTEL_PREFIXES[id]) ? { roomNumber: new RegExp("^" + HOTEL_PREFIXES[id] + "-", "i") } : {}; }

// ── POST /api/manager/login ───────────────────────────────
export const managerLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success:false, message:"Email and password are required." });
    const manager = await AdminUser.findOne({ email: email.toLowerCase().trim(), isActive: true });
    if (!manager) return res.status(401).json({ success:false, message:"Invalid credentials." });
    const valid = manager.password.startsWith("$2")
      ? await bcrypt.compare(password, manager.password)
      : manager.password === password;
    if (!valid) return res.status(401).json({ success:false, message:"Invalid credentials." });
    manager.lastLogin = new Date();
    await manager.save();
    const payload = {
      id: manager._id, name: manager.name, email: manager.email, role: manager.role,
      assignedHotelId: manager.assignedHotelId || null,
      assignedHotelName: manager.assignedHotelName || null,
      hotelObjectId: manager.hotelObjectId || null,
    };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    res.status(200).json({ success:true, message:"Login successful", data:{ ...payload, token } });
  } catch (err) { next(err); }
};

// ── GET /api/manager/dashboard ────────────────────────────
export const getManagerDashboard = async (req, res, next) => {
  try {
    const { scopedHotelId: hotelId, scopedHotelName: hotelName } = req;
    const hf = hotelNameFilter(hotelName);
    const rf = { isActive:true, ...roomPrefixFilter(hotelId) };
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
    const filter = { isActive:true, ...roomPrefixFilter(req.scopedHotelId) };
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
    let { roomNumber } = req.body;
    const prefix = HOTEL_PREFIXES[hotelId];
    if (prefix && roomNumber && !roomNumber.toLowerCase().startsWith(prefix + "-"))
      roomNumber = prefix + "-" + roomNumber;
    const room = await Room.findOneAndUpdate(
      { roomNumber },
      { ...req.body, roomNumber, hotelStringId: hotelId },
      { upsert:true, new:true, runValidators:true, setDefaultsOnInsert:true }
    );
    if (hotelId) {
      Hotel.findOneAndUpdate({ hotelId }, { $push:{ rooms:{ id:roomNumber, name:req.body.type||"Room", price:req.body.pricePerNight, capacity:req.body.capacity||2, bed:req.body.bedType||"King", available:1, features:req.body.amenities||[] } } }, { new:true }).catch(()=>{});
    }
    const io = req.app.get("io");
    if (io) io.emit("roomCreated", { roomId:room._id, roomNumber, hotelId, hotelName });
    res.status(201).json({ success:true, message:"Room created", data:room });
  } catch (err) { next(err); }
};

// ── PUT /api/manager/rooms/:id ────────────────────────────
export const updateManagerRoom = async (req, res, next) => {
  try {
    const hotelId = req.scopedHotelId;
    const room = await Room.findById(req.params.id);
    if (!room) return res.status(404).json({ success:false, message:"Room not found" });
    const prefix = HOTEL_PREFIXES[hotelId];
    if (prefix && !room.roomNumber.toLowerCase().startsWith(prefix + "-"))
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
    if (prefix && !room.roomNumber.toLowerCase().startsWith(prefix + "-"))
      return res.status(403).json({ success:false, message:"Unauthorized: You do not have management access to this property.", code:"HOTEL_ACCESS_DENIED" });
    await Room.findByIdAndUpdate(req.params.id, { isActive:false });
    res.status(200).json({ success:true, message:"Room deactivated successfully" });
  } catch (err) { next(err); }
};

// ── GET /api/manager/bookings ─────────────────────────────
export const getManagerBookings = async (req, res, next) => {
  try {
    const { status, guestEmail } = req.query;
    const filter = { ...hotelNameFilter(req.scopedHotelName) };
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
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success:false, message:"Booking not found" });
    const hn = req.scopedHotelName;
    if (hn && booking.hotelName && !booking.hotelName.toLowerCase().includes(hn.toLowerCase().slice(0,6)))
      return res.status(403).json({ success:false, message:"Unauthorized: This booking does not belong to your hotel.", code:"HOTEL_ACCESS_DENIED" });
    if (booking.status === "Cancelled") return res.status(400).json({ success:false, message:"Cannot check in a cancelled booking" });
    if (booking.status === "CheckedIn") return res.status(400).json({ success:false, message:"Guest is already checked in" });
    booking.status = "CheckedIn";
    booking.checkedInAt = new Date();
    await booking.save();
    await Room.findByIdAndUpdate(booking.room, { status:"Booked" });
    const io = req.app.get("io");
    if (io) io.emit("bookingCheckedIn", { bookingId:booking._id, hotelName:booking.hotelName });
    res.status(200).json({ success:true, message:"Guest checked in successfully", data:booking });
  } catch (err) { next(err); }
};

// ── PUT /api/manager/bookings/:id/checkout ────────────────
export const checkOutBooking = async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success:false, message:"Booking not found" });
    if (booking.status !== "CheckedIn") return res.status(400).json({ success:false, message:"Guest must be checked in before checking out" });
    booking.status = "CheckedOut";
    booking.checkedOutAt = new Date();
    await booking.save();
    await Room.findByIdAndUpdate(booking.room, { status:"Available" });
    const io = req.app.get("io");
    if (io) io.emit("bookingCheckedOut", { bookingId:booking._id, hotelName:booking.hotelName });
    res.status(200).json({ success:true, message:"Guest checked out successfully", data:booking });
  } catch (err) { next(err); }
};

// ── POST /api/manager/bookings/walkin ─────────────────────
export const createWalkInBooking = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { roomId, guest: guestData, checkIn, checkOut, pricePerNight, subtotal, taxes=0, discount=0, totalAmount, paymentMethod="cash", specialRequests="" } = req.body;
    if (!roomId || !guestData?.name || !guestData?.email || !guestData?.phone || !checkIn || !checkOut || !totalAmount)
      return res.status(400).json({ success:false, message:"roomId, guest (name/email/phone), checkIn, checkOut, totalAmount are required" });
    let room = mongoose.Types.ObjectId.isValid(roomId)
      ? await Room.findById(roomId).session(session)
      : await Room.findOne({ roomNumber:roomId, isActive:true }).session(session);
    if (!room) { await session.abortTransaction(); return res.status(404).json({ success:false, message:"Room not found" }); }
    const prefix = HOTEL_PREFIXES[req.scopedHotelId];
    if (prefix && !room.roomNumber.toLowerCase().startsWith(prefix + "-")) {
      await session.abortTransaction();
      return res.status(403).json({ success:false, message:"Room does not belong to your hotel", code:"HOTEL_ACCESS_DENIED" });
    }
    if (room.status !== "Available") { await session.abortTransaction(); return res.status(409).json({ success:false, message:"Room is currently " + room.status }); }
    let guest = await Guest.findOne({ email: guestData.email }).session(session);
    if (!guest) { [guest] = await Guest.create([{ name:guestData.name, email:guestData.email, phone:guestData.phone, city:guestData.city||"" }], { session }); }
    const [booking] = await Booking.create([{
      room: room._id, guest: guest._id,
      guestSnapshot: { name:guestData.name, email:guestData.email, phone:guestData.phone },
      checkIn: new Date(checkIn), checkOut: new Date(checkOut),
      pricePerNight: pricePerNight || room.pricePerNight,
      subtotal: subtotal || totalAmount,
      taxes, discount, totalAmount, paymentMethod, specialRequests,
      hotelName: req.scopedHotelName || "",
      status: "CheckedIn", checkedInAt: new Date(), isWalkIn: true,
    }], { session });
    await Room.findByIdAndUpdate(room._id, { status:"Booked" }, { session });
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
    const hf = hotelNameFilter(req.scopedHotelName);
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
    if (req.scopedHotelName && !bookingId) {
      const ids = (await Booking.find(hotelNameFilter(req.scopedHotelName)).select("_id").lean()).map(b => b._id);
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
    if (req.scopedHotelId) filter.hotelStringId = req.scopedHotelId;
    const halls = await FunctionHall.find(filter).sort({ name:1 });
    res.status(200).json({ success:true, count:halls.length, data:halls });
  } catch (err) { next(err); }
};

// ── POST /api/manager/halls ───────────────────────────────
export const createManagerHall = async (req, res, next) => {
  try {
    const hall = await FunctionHall.create({ ...req.body, hotelStringId:req.scopedHotelId, hotelName:req.scopedHotelName });
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
      hotelStringId: req.scopedHotelId, hotelName: req.scopedHotelName,
      roomId, roomNumber: room.roomNumber,
      createdBy: req.manager.id, createdByName: req.manager.name,
      currentPrice: room.pricePerNight, requestedPrice: Number(requestedPrice),
      reason: reason || "", effectiveDate: effectiveDate ? new Date(effectiveDate) : null,
    });
    res.status(201).json({ success:true, message:"Price request submitted", data:pr });
  } catch (err) { next(err); }
};

// ── GET /api/manager/price-requests ──────────────────────
export const getManagerPriceRequests = async (req, res, next) => {
  try {
    const filter = { hotelStringId: req.scopedHotelId };
    if (req.query.status) filter.status = req.query.status;
    const requests = await PriceRequest.find(filter)
      .populate("roomId",    "roomNumber type pricePerNight")
      .populate("createdBy", "name email")
      .sort({ createdAt:-1 });
    res.status(200).json({ success:true, count:requests.length, data:requests });
  } catch (err) { next(err); }
};
`;

writeFileSync('backend/controllers/managerController.js', content, 'utf8');
console.log('managerController.js written successfully:', content.length, 'chars');
