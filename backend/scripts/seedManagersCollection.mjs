/**
 * seedManagersCollection.mjs
 * Seeds the `managers` collection (used by manager login).
 * Run: node backend/scripts/seedManagersCollection.mjs
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

// ── Manager Schema (mirrors models/Manager.js) ────────────
const managerSchema = new mongoose.Schema(
  {
    name:              { type: String, required: true, trim: true },
    email:             { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:          { type: String, required: true },
    role:              { type: String, default: "Manager" },
    isActive:          { type: Boolean, default: true },
    lastLogin:         { type: Date },
    assignedHotelId:   { type: String, default: null },
    assignedHotelName: { type: String, default: null },
    hotelObjectId:     { type: mongoose.Schema.Types.ObjectId, ref: "Hotel", default: null },
  },
  { timestamps: true, collection: "managers" }
);
const Manager = mongoose.model("Manager", managerSchema);

// ── Hotel Schema (to look up ObjectIds) ──────────────────
const hotelSchema = new mongoose.Schema(
  { hotelId: String, name: String },
  { collection: "hotels" }
);
const Hotel = mongoose.model("Hotel", hotelSchema);

// ── Manager data ──────────────────────────────────────────
const MANAGERS = [
  { name: "Jean-Pierre Moreau",  email: "lumiere.manager@luxestay.com",    password: "Manager@Lumiere2024",    assignedHotelId: "h1", assignedHotelName: "Hôtel de Lumière" },
  { name: "Yuki Tanaka",         email: "azureskyline.manager@luxestay.com", password: "Manager@AzureSky2024", assignedHotelId: "h2", assignedHotelName: "The Azure Skyline" },
  { name: "Sarah Adler",         email: "coralbay.manager@luxestay.com",   password: "Manager@CoralBay2024",   assignedHotelId: "h3", assignedHotelName: "Coral Bay Resort" },
  { name: "Lukas Bauer",         email: "alpinepeak.manager@luxestay.com", password: "Manager@AlpinePeak2024", assignedHotelId: "h4", assignedHotelName: "Alpine Peak Lodge" },
  { name: "Jessica Hartwell",    email: "grandmetro.manager@luxestay.com", password: "Manager@GrandMetro2024", assignedHotelId: "h5", assignedHotelName: "The Grand Metropolitan" },
  { name: "Elena Papadopoulos",  email: "santorini.manager@luxestay.com",  password: "Manager@Santorini2024",  assignedHotelId: "h6", assignedHotelName: "Santorini Cliff Suites" },
  { name: "Ravi Shankar",        email: "swagruha.manager@luxestay.com",   password: "Manager@Swagruha2024",   assignedHotelId: "h7", assignedHotelName: "Swagruha Hotel" },
];

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅  Connected to MongoDB\n");

  // Fetch hotel ObjectIds for linking
  const hotels = await Hotel.find({}, { hotelId: 1, _id: 1 }).lean();
  const hotelMap = {};
  hotels.forEach((h) => { hotelMap[h.hotelId] = h._id; });
  console.log(`📦  Found ${hotels.length} hotels in DB: ${hotels.map(h => h.hotelId).join(", ")}\n`);

  let created = 0, updated = 0;

  for (const mgr of MANAGERS) {
    const hotelObjectId = hotelMap[mgr.assignedHotelId] || null;

    const existing = await Manager.findOne({ email: mgr.email });

    if (existing) {
      await Manager.findOneAndUpdate(
        { email: mgr.email },
        {
          name:              mgr.name,
          assignedHotelId:   mgr.assignedHotelId,
          assignedHotelName: mgr.assignedHotelName,
          hotelObjectId,
          isActive:          true,
        }
      );
      console.log(`  ↻  Updated : ${mgr.email.padEnd(28)} → ${mgr.assignedHotelName}`);
      updated++;
    } else {
      await Manager.create({
        name:              mgr.name,
        email:             mgr.email,
        password:          mgr.password,   // plain — login handles both plain & bcrypt
        role:              "Manager",
        assignedHotelId:   mgr.assignedHotelId,
        assignedHotelName: mgr.assignedHotelName,
        hotelObjectId,
        isActive:          true,
      });
      console.log(`  ✅  Created : ${mgr.email.padEnd(28)} → ${mgr.assignedHotelName}`);
      created++;
    }
  }

  console.log(`\n📊  Summary: ${created} created, ${updated} updated`);
  console.log("\n🔑  Login Credentials (all managers):");
  console.log("─".repeat(65));
  MANAGERS.forEach((m) => {
    console.log(`  Hotel  : ${m.assignedHotelName}`);
    console.log(`  Email  : ${m.email}`);
    console.log(`  Pass   : ${m.password}`);
    console.log();
  });
  console.log("─".repeat(65));

  await mongoose.connection.close();
  console.log("✅  Done. managers collection is ready.");
  process.exit(0);
};

seed().catch((err) => {
  console.error("❌  Seed failed:", err.message);
  process.exit(1);
});
