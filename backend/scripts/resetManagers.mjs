/**
 * resetManagers.mjs
 * Clears the managers collection and re-seeds with proper credentials.
 * Run: node backend/scripts/resetManagers.mjs
 */

import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import mongoose from "mongoose";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "../.env") });

import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

// ── Schemas ───────────────────────────────────────────────
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

const hotelSchema = new mongoose.Schema(
  { hotelId: String, name: String },
  { collection: "hotels" }
);
const Hotel = mongoose.model("Hotel", hotelSchema);

// ── Credentials ───────────────────────────────────────────
const MANAGERS = [
  {
    name:              "Jean-Pierre Moreau",
    email:             "lumiere.manager@luxestay.com",
    password:          "Manager@Lumiere2024",
    assignedHotelId:   "h1",
    assignedHotelName: "Hôtel de Lumière",
  },
  {
    name:              "Yuki Tanaka",
    email:             "azureskyline.manager@luxestay.com",
    password:          "Manager@AzureSky2024",
    assignedHotelId:   "h2",
    assignedHotelName: "The Azure Skyline",
  },
  {
    name:              "Sarah Adler",
    email:             "coralbay.manager@luxestay.com",
    password:          "Manager@CoralBay2024",
    assignedHotelId:   "h3",
    assignedHotelName: "Coral Bay Resort",
  },
  {
    name:              "Lukas Bauer",
    email:             "alpinepeak.manager@luxestay.com",
    password:          "Manager@AlpinePeak2024",
    assignedHotelId:   "h4",
    assignedHotelName: "Alpine Peak Lodge",
  },
  {
    name:              "Jessica Hartwell",
    email:             "grandmetro.manager@luxestay.com",
    password:          "Manager@GrandMetro2024",
    assignedHotelId:   "h5",
    assignedHotelName: "The Grand Metropolitan",
  },
  {
    name:              "Elena Papadopoulos",
    email:             "santorini.manager@luxestay.com",
    password:          "Manager@Santorini2024",
    assignedHotelId:   "h6",
    assignedHotelName: "Santorini Cliff Suites",
  },
  {
    name:              "Ravi Shankar",
    email:             "swagruha.manager@luxestay.com",
    password:          "Manager@Swagruha2024",
    assignedHotelId:   "h7",
    assignedHotelName: "Swagruha Hotel",
  },
];

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅  Connected to MongoDB\n");

  // 1. Clear old managers
  const { deletedCount } = await Manager.deleteMany({});
  console.log(`🗑️   Cleared ${deletedCount} old manager(s)\n`);

  // 2. Fetch hotel ObjectIds for linking
  const hotels = await Hotel.find({}, { hotelId: 1, _id: 1 }).lean();
  const hotelMap = {};
  hotels.forEach((h) => { hotelMap[h.hotelId] = h._id; });
  console.log(`📦  Hotels in DB: ${hotels.map((h) => h.hotelId).join(", ")}\n`);

  // 3. Insert fresh managers
  for (const mgr of MANAGERS) {
    await Manager.create({
      name:              mgr.name,
      email:             mgr.email,
      password:          mgr.password,   // plain text — login handles both plain & bcrypt
      role:              "Manager",
      assignedHotelId:   mgr.assignedHotelId,
      assignedHotelName: mgr.assignedHotelName,
      hotelObjectId:     hotelMap[mgr.assignedHotelId] || null,
      isActive:          true,
    });
    console.log(`  ✅  ${mgr.email.padEnd(40)} → ${mgr.assignedHotelName}`);
  }

  // 4. Print credentials table
  console.log("\n");
  console.log("─".repeat(75));
  console.log("  MANAGER LOGIN CREDENTIALS");
  console.log("─".repeat(75));
  MANAGERS.forEach((m) => {
    console.log(`  Hotel    : ${m.assignedHotelName}`);
    console.log(`  Email    : ${m.email}`);
    console.log(`  Password : ${m.password}`);
    console.log();
  });
  console.log("─".repeat(75));

  await mongoose.connection.close();
  console.log("\n✅  Done — managers collection ready.");
  process.exit(0);
};

run().catch((err) => {
  console.error("❌  Failed:", err.message);
  process.exit(1);
});
