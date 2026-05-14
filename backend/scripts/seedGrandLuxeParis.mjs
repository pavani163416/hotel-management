/**
 * seedGrandLuxeParis.mjs
 * Adds "Grand Luxe Paris" hotel (h8) to MongoDB and creates its manager.
 * Run: node backend/scripts/seedGrandLuxeParis.mjs
 */

import { config } from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dns from "dns";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: join(__dirname, "../.env") });

dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

// ── Schemas ───────────────────────────────────────────────
const hotelSchema = new mongoose.Schema({
  hotelId:       { type: String, required: true, unique: true },
  name:          { type: String, required: true },
  location:      String,
  city:          String,
  description:   String,
  image:         String,
  gallery:       [String],
  rating:        { type: Number, default: 4.8 },
  reviewCount:   { type: Number, default: 0 },
  pricePerNight: { type: Number, required: true },
  originalPrice: Number,
  discountPct:   { type: Number, default: 0 },
  isDeal:        { type: Boolean, default: false },
  type:          { type: String, default: "Hotel" },
  coords:        { type: [Number], default: [0, 0] },
  amenities:     [String],
  rooms: [{
    id: String, name: String, description: String,
    price: Number, capacity: Number, bed: String,
    available: Number, features: [String],
  }],
  reviews: [{ author: String, rating: Number, comment: String, date: String }],
  isActive:      { type: Boolean, default: true },
}, { timestamps: true });

const managerSchema = new mongoose.Schema({
  name:              { type: String, required: true },
  email:             { type: String, required: true, unique: true, lowercase: true },
  password:          { type: String, required: true },
  role:              { type: String, default: "Manager" },
  isActive:          { type: Boolean, default: true },
  lastLogin:         Date,
  assignedHotelId:   { type: String, default: null },
  assignedHotelName: { type: String, default: null },
  hotelObjectId:     { type: mongoose.Schema.Types.ObjectId, ref: "Hotel", default: null },
}, { timestamps: true, collection: "managers" });

const Hotel   = mongoose.model("Hotel",   hotelSchema);
const Manager = mongoose.model("Manager", managerSchema);

const img = "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80";

const HOTEL = {
  hotelId:       "h8",
  name:          "Grand Luxe Paris",
  location:      "1st Arrondissement, Paris",
  city:          "Paris",
  description:   "An opulent Parisian palace hotel steps from the Louvre, blending Belle Époque grandeur with contemporary luxury.",
  image:         img,
  gallery:       [
    img,
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80",
    "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80",
  ],
  rating:        4.9,
  reviewCount:   724,
  pricePerNight: 650,
  originalPrice: 820,
  discountPct:   20,
  isDeal:        true,
  type:          "Hotel",
  coords:        [48.8606, 2.3376],
  amenities:     ["Free WiFi", "Spa", "Pool", "Restaurant", "Concierge", "Airport Shuttle", "Bar", "Gym"],
  rooms: [
    {
      id: "glp-101", name: "Deluxe King Room",
      description: "40 sqm room with Louvre views and marble bathroom",
      price: 650, capacity: 2, bed: "1 King Bed", available: 5,
      features: ["WiFi", "Breakfast", "AC", "Minibar"],
    },
    {
      id: "glp-102", name: "Grand Suite",
      description: "80 sqm suite with separate lounge and panoramic Paris views",
      price: 1100, capacity: 3, bed: "1 King Bed + Sofa", available: 3,
      features: ["WiFi", "Breakfast", "Butler", "Spa Access"],
    },
    {
      id: "glp-103", name: "Royal Penthouse",
      description: "200 sqm penthouse with private terrace and Eiffel Tower view",
      price: 2800, capacity: 4, bed: "2 King Beds", available: 1,
      features: ["Private Terrace", "Butler", "Private Spa", "Airport Transfer"],
    },
  ],
  reviews: [
    { author: "Isabelle M.", rating: 5, comment: "The most luxurious hotel in Paris. Service is absolutely flawless.", date: "1 week ago" },
    { author: "Charles D.", rating: 5, comment: "Woke up to a view of the Louvre. Truly unforgettable.", date: "2 weeks ago" },
    { author: "Victoria R.", rating: 5, comment: "The spa is world-class. We will definitely return.", date: "1 month ago" },
  ],
  isActive: true,
};

const MANAGER = {
  name:              "Pierre Dubois",
  email:             "grandluxeparis.manager@luxestay.com",
  password:          "Manager@GrandLux2024",
  assignedHotelId:   "h8",
  assignedHotelName: "Grand Luxe Paris",
};

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅  Connected to MongoDB\n");

  // ── Upsert hotel ──────────────────────────────────────
  const existing = await Hotel.findOne({ hotelId: "h8" });
  let hotel;
  if (existing) {
    hotel = await Hotel.findOneAndUpdate({ hotelId: "h8" }, HOTEL, { new: true });
    console.log("↻  Hotel updated: Grand Luxe Paris (h8)");
  } else {
    hotel = await Hotel.create(HOTEL);
    console.log("✅  Hotel created: Grand Luxe Paris (h8)");
  }

  // ── Upsert manager ────────────────────────────────────
  const existingMgr = await Manager.findOne({ email: MANAGER.email });
  if (existingMgr) {
    await Manager.findOneAndUpdate(
      { email: MANAGER.email },
      {
        name:              MANAGER.name,
        assignedHotelId:   MANAGER.assignedHotelId,
        assignedHotelName: MANAGER.assignedHotelName,
        hotelObjectId:     hotel._id,
        isActive:          true,
      }
    );
    console.log("↻  Manager updated:", MANAGER.email);
  } else {
    const hashed = await bcrypt.hash(MANAGER.password, 12);
    await Manager.create({
      name:              MANAGER.name,
      email:             MANAGER.email,
      password:          hashed,
      role:              "Manager",
      assignedHotelId:   MANAGER.assignedHotelId,
      assignedHotelName: MANAGER.assignedHotelName,
      hotelObjectId:     hotel._id,
      isActive:          true,
    });
    console.log("✅  Manager created:", MANAGER.email);
  }

  console.log("\n─────────────────────────────────────────────");
  console.log("  Hotel    : Grand Luxe Paris");
  console.log("  Hotel ID : h8");
  console.log("  Email    : grandluxeparis.manager@luxestay.com");
  console.log("  Password : Manager@GrandLux2024");
  console.log("─────────────────────────────────────────────\n");

  await mongoose.connection.close();
  console.log("✅  Done.");
  process.exit(0);
};

run().catch((err) => {
  console.error("❌  Failed:", err.message);
  process.exit(1);
});
