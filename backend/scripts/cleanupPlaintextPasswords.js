/**
 * cleanupPlaintextPasswords.js
 * ─────────────────────────────────────────────────────────
 * One-time migration script to strip the `plainPassword` field
 * from every document in the `managers` collection.
 *
 * Run: node backend/scripts/cleanupPlaintextPasswords.js
 *
 * SECURITY: This script removes OWASP A02 Cryptographic Failures
 * by ensuring no plaintext passwords are stored in MongoDB.
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
  console.error("❌  MONGO_URI environment variable is not set.");
  process.exit(1);
}

const cleanup = async () => {
  await mongoose.connect(MONGO_URI);
  console.log("✅  Connected to MongoDB\n");

  const db = mongoose.connection.db;
  const collection = db.collection("managers");

  // Count how many documents have plainPassword set
  const countBefore = await collection.countDocuments({ plainPassword: { $exists: true } });
  console.log(`🔍  Found ${countBefore} manager(s) with plainPassword field stored.\n`);

  if (countBefore === 0) {
    console.log("✅  No plaintext passwords found. Database is already clean.");
    await mongoose.connection.close();
    process.exit(0);
  }

  // Remove the plainPassword field from all manager documents
  const result = await collection.updateMany(
    { plainPassword: { $exists: true } },
    { $unset: { plainPassword: "" } }
  );

  console.log(`🧹  Removed plainPassword from ${result.modifiedCount} manager document(s).`);

  // Verify cleanup
  const countAfter = await collection.countDocuments({ plainPassword: { $exists: true } });
  if (countAfter === 0) {
    console.log("✅  Verification passed: no plainPassword fields remain in the managers collection.");
  } else {
    console.error(`❌  WARNING: ${countAfter} document(s) still have plainPassword. Manual investigation required.`);
    process.exit(1);
  }

  // Also ensure all managers have the mustChangePassword field
  const withoutFlag = await collection.countDocuments({ mustChangePassword: { $exists: false } });
  if (withoutFlag > 0) {
    await collection.updateMany(
      { mustChangePassword: { $exists: false } },
      { $set: { mustChangePassword: true } }
    );
    console.log(`🔒  Set mustChangePassword=true on ${withoutFlag} manager(s) missing the flag.`);
  }

  console.log("\n✅  Cleanup complete. Manager collection is now production-safe.");
  await mongoose.connection.close();
  process.exit(0);
};

cleanup().catch((err) => {
  console.error("❌  Cleanup failed:", err.message);
  process.exit(1);
});
