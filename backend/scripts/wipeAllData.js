/**
 * wipeAllData.js
 * ─────────────────────────────────────────────────────────
 * Completely wipes ALL dummy/seed data from every collection.
 * Keeps: Hotels (structure only), RoomTypes, Managers, AdminUsers
 * Deletes: Bookings, Guests, Rooms, Visitors, Payments,
 *          CancellationRefunds, Notifications, AuditLogs,
 *          PriceRequests, FunctionHalls, AdditionalGuests,
 *          Maintenance records, Coupons, PublicSupportRequests
 *
 * Run: node backend/scripts/wipeAllData.js
 */

import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "../.env") });

import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("❌  MONGO_URI is not set.");
  process.exit(1);
}

const wipe = async () => {
  await mongoose.connect(MONGO_URI);
  const db = mongoose.connection.db;
  console.log("✅  Connected to MongoDB\n");

  const toDrop = [
    "bookings",
    "guests",
    "rooms",
    "visitors",
    "payments",
    "cancellationrefunds",
    "notifications",
    "auditlogs",
    "pricerequests",
    "functionhalls",
    "additionalguests",
    "maintenances",
    "coupons",
    "publicsupportrequests",
  ];

  console.log("🗑️  Wiping all dummy/seed data...\n");

  for (const col of toDrop) {
    try {
      const result = await db.collection(col).deleteMany({});
      console.log(`  ✅  ${col.padEnd(28)} → deleted ${result.deletedCount} document(s)`);
    } catch (e) {
      console.log(`  ⚠️  ${col.padEnd(28)} → ${e.message}`);
    }
  }

  // Reset room counts on hotels (rooms will be regenerated when hotels are edited)
  try {
    await db.collection("hotels").updateMany({}, { $set: { rooms: [] } });
    console.log(`\n  ✅  hotels.rooms array cleared`);
  } catch (e) {
    console.log(`  ⚠️  hotels update: ${e.message}`);
  }

  console.log("\n✅  All dummy data wiped successfully.");
  console.log("📝  The system is now clean. Real data will populate as actual bookings are made.\n");

  await mongoose.connection.close();
  process.exit(0);
};

wipe().catch((err) => {
  console.error("❌  Wipe failed:", err.message);
  process.exit(1);
});
