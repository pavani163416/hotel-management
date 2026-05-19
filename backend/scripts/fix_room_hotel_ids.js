/**
 * fix_room_hotel_ids.js
 *
 * One-time migration: tags every Room document with the correct hotelStringId
 * by matching room number prefixes to known hotel IDs.
 *
 * Run: node scripts/fix_room_hotel_ids.js
 */

import "dotenv/config";
import mongoose from "mongoose";
import dns from "dns";

dns.setDefaultResultOrder("ipv4first");

// ── Connect ───────────────────────────────────────────────
await mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 15000,
  family: 4,
});
console.log("Connected to MongoDB");

// ── Models (inline to avoid import chain issues) ──────────
const hotelSchema = new mongoose.Schema({ hotelId: String, name: String }, { collection: "hotels" });
const roomSchema  = new mongoose.Schema(
  { roomNumber: String, hotelStringId: String, hotelId: mongoose.Schema.Types.ObjectId },
  { collection: "rooms" }
);
const Hotel = mongoose.models.Hotel || mongoose.model("Hotel", hotelSchema);
const Room  = mongoose.models.Room  || mongoose.model("Room",  roomSchema);

// ── Fetch all hotels ──────────────────────────────────────
const hotels = await Hotel.find({}).lean();
console.log(`Found ${hotels.length} hotels`);

// Build prefix → hotel map
// Prefix is derived from the room numbers already in the DB
// e.g. "hdl-101" → prefix "hdl" → hotel h1
const KNOWN_PREFIXES = {
  hdl: "h1", tas: "h2", cbr: "h3", apl: "h4",
  tgm: "h5", scs: "h6", swg: "h7",
};

// Also build a map from hotel name initials for unknown hotels
// e.g. "swagruha hotel" → initials "sh" or first 3 chars of first word "swa"
function derivePrefix(hotelName) {
  const clean = hotelName.toLowerCase().replace(/[^a-z0-9\s]/g, "");
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    const main = words[0];
    if (main.length >= 3) return main.slice(0, 3);
    return words.map((w) => w[0]).join("").slice(0, 4);
  }
  return clean.slice(0, 3);
}

// Build full prefix → { hotelId, hotelObjectId } map
const prefixMap = { ...Object.fromEntries(Object.entries(KNOWN_PREFIXES).map(([p, id]) => [p, { hotelStringId: id }])) };
for (const hotel of hotels) {
  const prefix = derivePrefix(hotel.name);
  if (!prefixMap[prefix]) {
    prefixMap[prefix] = { hotelStringId: hotel.hotelId, hotelObjectId: hotel._id };
  }
  // Also map by hotelId directly
  prefixMap[hotel.hotelId] = { hotelStringId: hotel.hotelId, hotelObjectId: hotel._id };
}

console.log("Prefix map:", JSON.stringify(prefixMap, null, 2));

// ── Fetch all rooms ───────────────────────────────────────
const rooms = await Room.find({}).lean();
console.log(`Found ${rooms.length} rooms total`);

let updated = 0;
let skipped = 0;
let unmatched = 0;

for (const room of rooms) {
  // Extract prefix from room number (e.g. "hdl-101" → "hdl", "nh-102" → "nh")
  const match = room.roomNumber?.match(/^([a-z]+)-/i);
  if (!match) { unmatched++; continue; }

  const prefix = match[1].toLowerCase();
  const hotelInfo = prefixMap[prefix];

  if (!hotelInfo) {
    console.log(`  ⚠ No hotel match for prefix "${prefix}" (room: ${room.roomNumber})`);
    unmatched++;
    continue;
  }

  // Skip if already correctly tagged
  if (room.hotelStringId === hotelInfo.hotelStringId) {
    skipped++;
    continue;
  }

  const updateData = { hotelStringId: hotelInfo.hotelStringId };
  if (hotelInfo.hotelObjectId) updateData.hotelId = hotelInfo.hotelObjectId;

  await Room.updateOne({ _id: room._id }, { $set: updateData });
  console.log(`  ✓ ${room.roomNumber} → hotelStringId: ${hotelInfo.hotelStringId}`);
  updated++;
}

console.log(`\nDone. Updated: ${updated}, Already correct: ${skipped}, Unmatched: ${unmatched}`);
await mongoose.disconnect();
