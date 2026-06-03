/**
 * seedController.js
 * Seeds the 'controller' database — structural data ONLY.
 * NO dummy transactions, guests, visitors or fake bookings.
 *
 * Run: node backend/utils/seedController.js
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

  // Clear ALL dummy data from all controller collections
  await Promise.all([
    AdminUser.deleteMany({}),
    Transaction.deleteMany({}),
    VisitorLog.deleteMany({}),
    HotelSnapshot.deleteMany({}),
  ]);
  console.log("🗑️  Cleared all controller collections\n");

  console.log("✅  Controller database wiped clean.");
  console.log("📝  Real data will populate from actual usage.\n");

  await conn.close();
  process.exit(0);
};

seed().catch((err) => {
  console.error("❌  Seed failed:", err.message);
  process.exit(1);
});
