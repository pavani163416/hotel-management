import jwt      from "jsonwebtoken";
import bcrypt   from "bcryptjs";
import mongoose from "mongoose";
import Booking  from "../models/Booking.js";
import Room     from "../models/Room.js";
import Guest    from "../models/Guest.js";
import Hotel    from "../models/Hotel.js";
import AdminUser from "../models/AdminUser.js";
import Visitor  from "../models/Visitor.js";
import logger   from "../utils/logger.js";
import connectAdminDB from "../config/adminDb.js";

const JWT_EXPIRES = "8h";

const getSecret = () => {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("Server misconfiguration: JWT_SECRET missing");
  return s;
};

// Lazy-load the AdminUser model from the controller DB
let AdminUserModel = null;
const getAdminUserModel = async () => {
  if (AdminUserModel) return AdminUserModel;
  const conn = await connectAdminDB();
  if (!conn) return null;
  const schema = new mongoose.Schema({
    name:     String,
    email:    { type: String, lowercase: true },
    password: String,
    role:     String,
    isActive: Boolean,
    lastLogin: Date,
  }, { collection: "adminusers" });
  // Reuse existing model if already compiled on this connection
  AdminUserModel = conn.models.AdminUser || conn.model("AdminUser", schema);
  return AdminUserModel;
};

// ─────────────────────────────────────────────────────────
// POST /api/admin/login
// Looks up admin from controller DB; falls back to .env if DB unavailable
// ─────────────────────────────────────────────────────────
export const adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: "Email and password are required." });
    }
    if (password.length > 72) {
      return res.status(400).json({ success: false, message: "Password exceeds maximum allowed length." });
    }

    let adminName = process.env.ADMIN_NAME || "Super Admin";
    let passwordMatch = false;
    let emailMatch = false;

    // ── Try DB lookup first ───────────────────────────
    try {
      const Model = await getAdminUserModel();
      if (Model) {
        const adminUser = await Model.findOne({
          email: email.toLowerCase().trim(),
          isActive: true,
        });
        if (adminUser) {
          emailMatch = true;
          adminName  = adminUser.name || adminName;
          passwordMatch = await bcrypt.compare(password, adminUser.password);
          if (passwordMatch) {
            // Update lastLogin
            adminUser.lastLogin = new Date();
            await adminUser.save().catch(() => {});
          }
        }
      }
    } catch (dbErr) {
      logger.warn("Admin DB lookup failed, falling back to env", { error: dbErr.message });
    }

    // ── Fallback to .env if DB lookup failed ──────────
    if (!emailMatch) {
      const adminEmail    = process.env.ADMIN_EMAIL;
      const adminPassword = process.env.ADMIN_PASSWORD;
      if (adminEmail && adminPassword) {
        emailMatch = email.toLowerCase().trim() === adminEmail.toLowerCase().trim();
        if (emailMatch) {
          passwordMatch = adminPassword.startsWith("$2")
            ? await bcrypt.compare(password, adminPassword)
            : password === adminPassword;
        }
      }
    }

    const DUMMY_HASH = "$2b$12$abcdefghijklmnopqrstuvwxyz12345678901234567890";
    if (!emailMatch) {
      await bcrypt.compare(password, DUMMY_HASH);
    }

    if (!emailMatch || !passwordMatch) {
      logger.warn("Failed admin login attempt", { ip: req.ip, email });
      return res.status(401).json({ success: false, message: "Invalid credentials." });
    }

    const payload = {
      id:    "admin",
      email: email.toLowerCase().trim(),
      role:  "Super Admin",
      name:  adminName,
    };

    const token = jwt.sign(payload, getSecret(), { expiresIn: JWT_EXPIRES });
    logger.info("Admin login successful", { email: payload.email, ip: req.ip });

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: { ...payload, token },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// GET /api/admin/stats
// ─────────────────────────────────────────────────────────
export const getAdminStats = async (req, res, next) => {
  try {
    const [
      totalHotels,
      totalBookings,
      confirmedBookings,
      cancelledBookings,
      totalGuests,
      totalVisitors,
      availableRooms,
      bookedRooms,
      maintenanceRooms,
      totalRoomsCount,
      revenueAgg,
      monthRevenueAgg,
    ] = await Promise.all([
      Hotel.countDocuments({ isActive: true }),
      Booking.countDocuments(),
      Booking.countDocuments({ status: "Confirmed" }),
      Booking.countDocuments({ status: "Cancelled" }),
      Guest.countDocuments(),
      Visitor.countDocuments(),
      Room.countDocuments({ isActive: true, status: "Available" }),
      Room.countDocuments({ isActive: true, status: "Booked" }),
      Room.countDocuments({ isActive: true, status: "Maintenance" }),
      Room.countDocuments({ isActive: true }),
      Booking.aggregate([
        { $match: { status: { $in: ["Confirmed", "Completed"] } } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),
      Booking.aggregate([
        {
          $match: {
            status: { $in: ["Confirmed", "Completed"] },
            createdAt: {
              $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
        },
        { $group: { _id: null, total: { $sum: "$totalAmount" }, count: { $sum: 1 } } },
      ]),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalHotels,
        totalBookings,
        confirmedBookings,
        cancelledBookings,
        totalRevenue:      revenueAgg[0]?.total || 0,
        revenueThisMonth:  monthRevenueAgg[0]?.total || 0,
        bookingsThisMonth: monthRevenueAgg[0]?.count || 0,
        totalGuests,
        totalVisitors,
        totalRooms:        totalRoomsCount,
        availableRooms,
        bookedRooms,
        maintenanceRooms,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────────────────
// GET /api/admin/analytics
// Monthly revenue + booking trends — occupancyRate is dynamic
// ─────────────────────────────────────────────────────────
export const getAdminAnalytics = async (req, res, next) => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const [monthlyRevenue, statusBreakdown, topRooms, totalRooms, occupiedRooms] =
      await Promise.all([
        Booking.aggregate([
          {
            $match: {
              status: { $in: ["Confirmed", "Completed"] },
              createdAt: { $gte: sixMonthsAgo },
            },
          },
          {
            $group: {
              _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
              revenue:  { $sum: "$totalAmount" },
              bookings: { $sum: 1 },
            },
          },
          { $sort: { "_id.year": 1, "_id.month": 1 } },
        ]),
        Booking.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
        Booking.aggregate([
          { $group: { _id: "$room", count: { $sum: 1 }, revenue: { $sum: "$totalAmount" } } },
          { $sort: { count: -1 } },
          { $limit: 5 },
          { $lookup: { from: "rooms", localField: "_id", foreignField: "_id", as: "roomInfo" } },
        ]),
        Room.countDocuments({ isActive: true }),
        Room.countDocuments({ isActive: true, status: { $in: ["Booked", "CheckedIn"] } }),
      ]);

    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const revenueData = monthlyRevenue.map((m) => ({
      month:    months[m._id.month - 1],
      revenue:  m.revenue,
      bookings: m.bookings,
    }));

    // Dynamic occupancy rate
    const occupancyRate =
      totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100 * 10) / 10 : 0;

    res.status(200).json({
      success: true,
      data: { monthlyRevenue: revenueData, statusBreakdown, topRooms, occupancyRate },
    });
  } catch (error) {
    next(error);
  }
};
