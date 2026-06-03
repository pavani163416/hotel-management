/**
 * wipeControllerData.js
 * Wipes ALL dummy/seed data from the controller (admin panel) database.
 * Run: node backend/scripts/wipeControllerData.js
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

const MONGO_ADMIN_URI = process.env.MONGO_ADMIN_URI;
if (!MONGO_ADMIN_URI) {
  console.error("❌  MONGO_ADMIN_URI is not set.");
  process.exit(1);
}

const wipe = async () => {
  const conn = await mongoose.createConnection(MONGO_ADMIN_URI, {
    serverSelectionTimeoutMS: 15000,
    family: 4,
  }).asPromise();

  console.log(`✅  Connected to controller DB\n`);

  const db = conn.db;

  const toDrop = [
    "transactions",
    "visitorlogs",
    "hotelsnapshots",
    "notifications",
  ];

  console.log("🗑️  Wiping controller dummy data...\n");

  for (const col of toDrop) {
    try {
      const result = await db.collection(col).deleteMany({});
      console.log(`  ✅  ${col.padEnd(28)} → deleted ${result.deletedCount} document(s)`);
    } catch (e) {
      console.log(`  ⚠️  ${col.padEnd(28)} → ${e.message}`);
    }
  }

  console.log("\n✅  Controller database wiped successfully.");
  console.log("📝  Real transactions will populate from actual payments.\n");

  await conn.close();
  process.exit(0);
};

wipe().catch((err) => {
  console.error("❌  Controller wipe failed:", err.message);
  process.exit(1);
});
