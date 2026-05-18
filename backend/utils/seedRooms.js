/**
 * Seed script — populates the database with rooms that match
 * the frontend hotel data exactly (same prices, types, names).
 *
 * ✅ Run from INSIDE the backend folder:
 *    cd backend
 *    node utils/seedRooms.js
 */

import "dotenv/config";
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

import mongoose from "mongoose";
import Room from "../models/Room.js";
import connectDB from "../config/db.js";

// These match the frontend src/data/hotels.ts EXACTLY
// roomNumber = initials of hotel name + room number (e.g. hdl-101 = Hôtel de Lumière room 101)
const sampleRooms = [
  // ── Hôtel de Lumière (hdl) ─────────────────────────────
  { roomNumber: "hdl-101", type: "Deluxe",    description: "35 sqm city view with king bed",           pricePerNight: 480,  capacity: 2, bedType: "King",  floor: 2,  amenities: ["Free WiFi", "Breakfast", "AC"],                  images: ["https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80"], status: "Available" },
  { roomNumber: "hdl-102", type: "Suite",     description: "55 sqm panoramic suite with lounge",       pricePerNight: 780,  capacity: 3, bedType: "King",  floor: 3,  amenities: ["Free WiFi", "Breakfast", "Mini Bar", "Spa Access"], images: ["https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80"], status: "Available" },
  { roomNumber: "hdl-103", type: "Penthouse", description: "120 sqm penthouse with private terrace",   pricePerNight: 1450, capacity: 4, bedType: "King",  floor: 10, amenities: ["Butler", "Private Spa", "Airport Transfer"],       images: ["https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80"], status: "Available" },
  // ── The Azure Skyline (tas) ────────────────────────────
  { roomNumber: "tas-101", type: "Standard",  description: "City view with floor-to-ceiling windows",  pricePerNight: 620,  capacity: 2, bedType: "Queen", floor: 5,  amenities: ["Free WiFi", "AC", "Mini Bar"],                   images: ["https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80"],    status: "Available" },
  { roomNumber: "tas-102", type: "Suite",     description: "Corner suite with separate living room",   pricePerNight: 980,  capacity: 3, bedType: "King",  floor: 8,  amenities: ["Free WiFi", "Breakfast", "Lounge Access"],         images: ["https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80"],    status: "Available" },
  // ── Coral Bay Resort (cbr) ─────────────────────────────
  { roomNumber: "cbr-101", type: "Villa",     description: "Private beachfront villa with plunge pool", pricePerNight: 1850, capacity: 2, bedType: "King",  floor: 1,  amenities: ["Plunge Pool", "Butler", "Beach Access"],           images: ["https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80"],  status: "Available" },
  { roomNumber: "cbr-102", type: "Villa",     description: "Glass-floor bungalow over the lagoon",     pricePerNight: 2400, capacity: 2, bedType: "King",  floor: 1,  amenities: ["Glass Floor", "Direct Ocean Access", "Butler"],    images: ["https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80"],  status: "Available" },
  // ── Alpine Peak Lodge (apl) ────────────────────────────
  { roomNumber: "apl-101", type: "Standard",  description: "Cozy room with mountain views",            pricePerNight: 540,  capacity: 2, bedType: "Queen", floor: 1,  amenities: ["Free WiFi", "Fireplace", "Mountain View"],         images: ["https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80"],    status: "Available" },
  { roomNumber: "apl-102", type: "Suite",     description: "Two-floor suite with private balcony",     pricePerNight: 920,  capacity: 4, bedType: "King",  floor: 2,  amenities: ["Balcony", "Sauna", "Ski Storage"],                 images: ["https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80"],    status: "Available" },
  // ── The Grand Metropolitan (tgm) ──────────────────────
  { roomNumber: "tgm-101", type: "Standard",  description: "Elegant room with skyline view",           pricePerNight: 420,  capacity: 2, bedType: "King",  floor: 3,  amenities: ["Free WiFi", "AC", "Smart TV"],                   images: ["https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&q=80"],  status: "Available" },
  { roomNumber: "tgm-102", type: "Suite",     description: "Spacious suite with city views",           pricePerNight: 720,  capacity: 3, bedType: "King",  floor: 6,  amenities: ["Free WiFi", "Lounge Access", "Breakfast"],         images: ["https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&q=80"],  status: "Available" },
  // ── Santorini Cliff Suites (scs) ──────────────────────
  { roomNumber: "scs-101", type: "Suite",     description: "Cave suite with private hot tub",          pricePerNight: 890,  capacity: 2, bedType: "King",  floor: 1,  amenities: ["Hot Tub", "Caldera View", "Breakfast"],            images: ["https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80"],  status: "Available" },
  { roomNumber: "scs-102", type: "Villa",     description: "Private villa with infinity pool",         pricePerNight: 1650, capacity: 2, bedType: "King",  floor: 2,  amenities: ["Infinity Pool", "Butler", "Private Terrace"],      images: ["https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80"],  status: "Available" },
];

// ── Himalaya Hotel (hh) — added to support frontend fixtures that use `hh-101` ──
sampleRooms.push(
  { roomNumber: "hh-101", type: "Deluxe",    description: "Mountain view deluxe room",      pricePerNight: 560,  capacity: 2, bedType: "Queen", floor: 2, amenities: ["Free WiFi", "Breakfast", "Heater"], images: ["https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80"], status: "Available" },
  { roomNumber: "hh-102", type: "Standard",  description: "Comfort room with valley view",  pricePerNight: 420,  capacity: 2, bedType: "Queen", floor: 1, amenities: ["Free WiFi", "AC"], images: ["https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&q=80"], status: "Available" }
);

// ── Additional alias (nh) — cover frontends that use `nh-101` prefix
sampleRooms.push(
  { roomNumber: "nh-101", type: "Deluxe",   description: "Mountain view deluxe room (alias)", pricePerNight: 560, capacity: 2, bedType: "Queen", floor: 2, amenities: ["Free WiFi", "Breakfast", "Heater"], images: ["https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80"], status: "Available" },
  { roomNumber: "nh-102", type: "Standard", description: "Comfort room with valley view (alias)", pricePerNight: 420, capacity: 2, bedType: "Queen", floor: 1, amenities: ["Free WiFi", "AC"], images: ["https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800&q=80"], status: "Available" }
);

const seed = async () => {
  await connectDB();

  await Room.deleteMany({});
  console.log("🗑️  Cleared existing rooms");

  const inserted = await Room.insertMany(sampleRooms);
  console.log(`🌱  Seeded ${inserted.length} rooms successfully`);

  // Show the mapping for reference
  console.log("\n📋  Room number → MongoDB _id mapping:");
  inserted.forEach((r) => console.log(`    ${r.roomNumber.padEnd(8)} → ${r._id}`));

  await mongoose.connection.close();
  console.log("\n✅  Done — database connection closed");
  process.exit(0);
};

seed().catch((err) => {
  console.error("❌  Seed failed:", err.message);
  process.exit(1);
});
