import "dotenv/config";
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

import mongoose from "mongoose";
import Hotel from "../models/Hotel.js";
import Room from "../models/Room.js";
import { syncRoomsForHotel } from "../services/roomGenerationService.js";

async function migrate() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB for migration");

  const hotels = await Hotel.find({});
  console.log(`Found ${hotels.length} hotels to process.`);

  for (const hotel of hotels) {
    console.log(`Processing Hotel: ${hotel.name} (${hotel.hotelId})`);
    
    // Ensure roomInventory format
    if (!hotel.roomInventory || hotel.roomInventory.size === 0) {
      console.log(`  Skipping: No room inventory defined.`);
      continue;
    }

    try {
      await syncRoomsForHotel(hotel);
      console.log(`  Successfully synchronized rooms for ${hotel.name}`);
    } catch (err) {
      console.error(`  Error synchronizing rooms for ${hotel.name}:`, err.message);
    }
  }

  await mongoose.connection.close();
  console.log("Migration completed, database connection closed.");
}

migrate().catch(console.error);
