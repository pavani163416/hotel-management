/**
 * Seed script for the 'controller' database (admin panel data)
 * Collections: adminusers, transactions, visitorlogs, hotelsnapshots
 *
 * Run: cd backend && node utils/seedController.js
 */
import "dotenv/config";
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

import mongoose from "mongoose";
import AdminUserModel     from "../models/admin/AdminUser.js";
import TransactionModel   from "../models/admin/Transaction.js";
import VisitorLogModel    from "../models/admin/VisitorLog.js";
import HotelSnapshotModel from "../models/admin/HotelSnapshot.js";

const seed = async () => {
  const uri = process.env.MONGO_ADMIN_URI;
  if (!uri) throw new Error("MONGO_ADMIN_URI not set in .env");

  const conn = await mongoose.createConnection(uri, {
    serverSelectionTimeoutMS: 15000,
    family: 4,
  }).asPromise();

  console.log(`✅  Connected to controller DB: ${conn.host}\n`);

  const AdminUser     = AdminUserModel(conn);
  const Transaction   = TransactionModel(conn);
  const VisitorLog    = VisitorLogModel(conn);
  const HotelSnapshot = HotelSnapshotModel(conn);

  // Clear all
  await Promise.all([
    AdminUser.deleteMany({}),
    Transaction.deleteMany({}),
    VisitorLog.deleteMany({}),
    HotelSnapshot.deleteMany({}),
  ]);
  console.log("🗑️  Cleared controller collections\n");

  // ── 1. Admin Users ──────────────────────────────────────
  const admins = await AdminUser.insertMany([
    { name: "Marcus Thorne", email: "admin@luxestay.com",   password: "admin123",   role: "Super Admin" },
    { name: "Priya Kapoor",  email: "manager@luxestay.com", password: "manager123", role: "Manager" },
    { name: "David Chen",    email: "staff@luxestay.com",   password: "staff123",   role: "Staff" },
  ]);
  console.log(`✅  AdminUsers   → ${admins.length} seeded`);
  admins.forEach(a => console.log(`    ${a.role.padEnd(14)} ${a.email}`));

  // ── 2. Hotel Snapshots ──────────────────────────────────
  const hotelSnaps = await HotelSnapshot.insertMany([
    { hotelId: "h1", name: "Hôtel de Lumière",       location: "Paris, France",       city: "Paris",     country: "FRANCE",      totalRooms: 3,  activeBookings: 89,  ytdRevenue: 2410000, status: "Active",      image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=60&q=80", subtitle: "Premium Heritage" },
    { hotelId: "h2", name: "The Azure Skyline",       location: "Tokyo, Japan",        city: "Tokyo",     country: "JAPAN",       totalRooms: 2,  activeBookings: 245, ytdRevenue: 5120500, status: "Active",      image: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=60&q=80",    subtitle: "Modern Luxury" },
    { hotelId: "h3", name: "Coral Bay Resort",        location: "Maldives",            city: "Maldives",  country: "MALDIVES",    totalRooms: 2,  activeBookings: 72,  ytdRevenue: 3840000, status: "Active",      image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=60&q=80",  subtitle: "Beachfront Escape" },
    { hotelId: "h4", name: "Alpine Peak Lodge",       location: "Zermatt, Switzerland",city: "Zermatt",   country: "SWITZERLAND", totalRooms: 2,  activeBookings: 0,   ytdRevenue: 1150000, status: "Maintenance", image: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=60&q=80",    subtitle: "Seasonal Resort" },
    { hotelId: "h5", name: "The Grand Metropolitan",  location: "New York, USA",       city: "New York",  country: "USA",         totalRooms: 2,  activeBookings: 120, ytdRevenue: 4200000, status: "Active",      image: "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=60&q=80",  subtitle: "Art Deco Landmark" },
    { hotelId: "h6", name: "Santorini Cliff Suites",  location: "Oia, Santorini",      city: "Santorini", country: "GREECE",      totalRooms: 2,  activeBookings: 55,  ytdRevenue: 2980000, status: "Active",      image: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=60&q=80",  subtitle: "Caldera Views" },
  ]);
  console.log(`\n✅  HotelSnaps  → ${hotelSnaps.length} seeded`);

  // ── 3. Transactions ─────────────────────────────────────
  const txns = await Transaction.insertMany([
    { transactionId: "TXN-A1B2C3D4", bookingRef: "LS-00001", guestName: "Elena Rodriguez", guestEmail: "elena.rodriguez@example.com", hotelName: "Hôtel de Lumière",      roomNumber: "hdl-101", roomType: "Deluxe",    checkIn: new Date("2025-10-15"), checkOut: new Date("2025-10-18"), nights: 3, amount: 1580,  method: "card",       status: "Paid" },
    { transactionId: "TXN-E5F6G7H8", bookingRef: "LS-00002", guestName: "Jameson Blake",   guestEmail: "j.blake@enterprise.com",      hotelName: "The Azure Skyline",     roomNumber: "tas-101", roomType: "Standard",  checkIn: new Date("2025-10-20"), checkOut: new Date("2025-10-22"), nights: 2, amount: 1340,  method: "upi",        status: "Paid" },
    { transactionId: "TXN-I9J0K1L2", bookingRef: "LS-00003", guestName: "Sarah Chen",      guestEmail: "sarah.chen@studio.co",        hotelName: "Coral Bay Resort",      roomNumber: "cbr-101", roomType: "Villa",     checkIn: new Date("2025-11-01"), checkOut: new Date("2025-11-05"), nights: 4, amount: 7600,  method: "card",       status: "Paid" },
    { transactionId: "TXN-M3N4O5P6", bookingRef: "LS-00004", guestName: "Michael Chang",   guestEmail: "m.chang@webnet.net",          hotelName: "The Grand Metropolitan",roomNumber: "tgm-101", roomType: "Standard",  checkIn: new Date("2025-11-10"), checkOut: new Date("2025-11-13"), nights: 3, amount: 1360,  method: "netbanking", status: "Paid" },
    { transactionId: "TXN-Q7R8S9T0", bookingRef: "LS-00005", guestName: "Priya Sharma",    guestEmail: "priya.sharma@design.io",      hotelName: "Santorini Cliff Suites",roomNumber: "scs-101", roomType: "Suite",     checkIn: new Date("2025-12-01"), checkOut: new Date("2025-12-04"), nights: 3, amount: 2790,  method: "card",       status: "Paid" },
    { transactionId: "TXN-U1V2W3X4", bookingRef: "LS-00006", guestName: "Carlos Rivera",   guestEmail: "c.rivera@corp.com",           hotelName: "Alpine Peak Lodge",     roomNumber: "apl-102", roomType: "Suite",     checkIn: new Date("2025-12-20"), checkOut: new Date("2025-12-23"), nights: 3, amount: 2880,  method: "upi",        status: "Refunded" },
  ]);
  console.log(`\n✅  Transactions → ${txns.length} seeded`);
  txns.forEach(t => console.log(`    ${t.transactionId}  ${t.guestName.padEnd(20)} $${t.amount}  ${t.status}`));

  // ── 4. Visitor Logs ─────────────────────────────────────
  const visitors = await VisitorLog.insertMany([
    { ip: "103.21.244.12",  country: "India",          countryCode: "IN", city: "Mumbai",        device: "Mobile",  browser: "Chrome",  os: "Android", page: "/hotels",   referrer: "google.com",    duration: 142, status: "Converted", sessionId: "sid001" },
    { ip: "185.60.216.35",  country: "United Kingdom", countryCode: "GB", city: "London",        device: "Desktop", browser: "Safari",  os: "macOS",   page: "/hotel/h2", referrer: "instagram.com", duration: 310, status: "Active",    sessionId: "sid002" },
    { ip: "72.229.28.185",  country: "United States",  countryCode: "US", city: "New York",      device: "Desktop", browser: "Chrome",  os: "Windows", page: "/",         referrer: "direct",        duration: 28,  status: "Bounced",   sessionId: "sid003" },
    { ip: "49.206.212.100", country: "India",          countryCode: "IN", city: "Bangalore",     device: "Mobile",  browser: "Chrome",  os: "Android", page: "/hotels",   referrer: "google.com",    duration: 198, status: "Converted", sessionId: "sid004" },
    { ip: "31.13.64.35",    country: "Germany",        countryCode: "DE", city: "Berlin",        device: "Desktop", browser: "Firefox", os: "Linux",   page: "/hotel/h1", referrer: "facebook.com",  duration: 87,  status: "Active",    sessionId: "sid005" },
    { ip: "202.43.120.55",  country: "Japan",          countryCode: "JP", city: "Tokyo",         device: "Mobile",  browser: "Safari",  os: "iOS",     page: "/booking",  referrer: "google.com",    duration: 420, status: "Converted", sessionId: "sid006" },
    { ip: "89.187.162.200", country: "France",         countryCode: "FR", city: "Paris",         device: "Desktop", browser: "Chrome",  os: "Windows", page: "/hotel/h1", referrer: "direct",        duration: 265, status: "Converted", sessionId: "sid007" },
    { ip: "116.58.246.11",  country: "Australia",      countryCode: "AU", city: "Sydney",        device: "Tablet",  browser: "Safari",  os: "iPadOS",  page: "/",         referrer: "google.com",    duration: 44,  status: "Bounced",   sessionId: "sid008" },
    { ip: "177.71.128.60",  country: "Brazil",         countryCode: "BR", city: "São Paulo",     device: "Mobile",  browser: "Chrome",  os: "Android", page: "/hotels",   referrer: "google.com",    duration: 180, status: "Active",    sessionId: "sid009" },
    { ip: "5.62.58.100",    country: "UAE",            countryCode: "AE", city: "Dubai",         device: "Desktop", browser: "Edge",    os: "Windows", page: "/hotel/h2", referrer: "direct",        duration: 390, status: "Converted", sessionId: "sid010" },
  ]);
  console.log(`\n✅  VisitorLogs  → ${visitors.length} seeded`);

  // ── Summary ─────────────────────────────────────────────
  console.log("\n" + "─".repeat(50));
  console.log("📊  controller database summary:");
  console.log(`    adminusers     → ${admins.length}`);
  console.log(`    hotelsnapshots → ${hotelSnaps.length}`);
  console.log(`    transactions   → ${txns.length}`);
  console.log(`    visitorlogs    → ${visitors.length}`);
  console.log("─".repeat(50));
  console.log("\n✅  controller database seeded!\n");

  await conn.close();
  process.exit(0);
};

seed().catch((err) => {
  console.error("❌  Seed failed:", err.message);
  process.exit(1);
});
