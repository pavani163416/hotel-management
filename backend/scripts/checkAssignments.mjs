import "dotenv/config";
import mongoose from "mongoose";

await mongoose.connect(process.env.MONGO_URI);

const Manager = (await import("../models/Manager.js")).default;
const Hotel   = (await import("../models/Hotel.js")).default;

const hotels   = await Hotel.find({ isActive: true }).select("hotelId name").lean();
const managers = await Manager.find({ isActive: true }).select("name email assignedHotelId assignedHotelName").lean();

console.log("\n=== HOTELS ===");
hotels.forEach(h => console.log(`  ${h.hotelId}  →  ${h.name}`));

console.log("\n=== MANAGER → HOTEL ASSIGNMENTS ===");
managers.forEach(m => {
  const hotel = hotels.find(h => h.hotelId === m.assignedHotelId);
  console.log(`  ${m.name} (${m.email})`);
  console.log(`    assignedHotelId: ${m.assignedHotelId || "NONE"}`);
  console.log(`    hotel found:     ${hotel ? hotel.name : "⚠️  NO MATCH — assistance requests won't route to this manager"}`);
});

console.log("\n=== UNASSIGNED HOTELS (no manager) ===");
const assignedIds = new Set(managers.map(m => m.assignedHotelId).filter(Boolean));
hotels.filter(h => !assignedIds.has(h.hotelId)).forEach(h =>
  console.log(`  ⚠️  ${h.hotelId} - ${h.name} has no manager assigned`)
);

await mongoose.disconnect();
