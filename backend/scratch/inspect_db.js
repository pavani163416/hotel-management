import "dotenv/config";
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

import mongoose from "mongoose";
import Room from "../models/Room.js";
import Booking from "../models/Booking.js";
import { findAvailableRoom, NON_BOOKABLE_STATUSES } from "../services/roomAllocationService.js";

async function simulate() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  // Get the first room (e.g., tas-101)
  const roomDoc = await Room.findOne({ isActive: true });
  if (!roomDoc) {
    console.log("No rooms found!");
    await mongoose.connection.close();
    return;
  }

  const roomId = roomDoc._id;
  console.log("Using Room ID:", roomId, "Room Number:", roomDoc.roomNumber, "Initial Status:", roomDoc.status);

  // 1. Simulate the first booking: 2025-09-01 to 2025-09-04
  console.log("\n--- Simulating First Booking (2025-09-01 to 2025-09-04) ---");
  let room1 = await findAvailableRoom({
    roomId,
    checkIn: "2025-09-01",
    checkOut: "2025-09-04",
  });
  console.log("Resolved room status:", room1?.status);
  
  // Update status to Booked
  await Room.findByIdAndUpdate(roomId, { status: "Booked" });
  console.log("Updated room status in DB to Booked");

  // Verify status in DB
  const roomAfter1 = await Room.findById(roomId);
  console.log("DB status check:", roomAfter1.status);

  // 2. Simulate the second booking (conflict check): 2025-10-01 to 2025-10-03
  console.log("\n--- Simulating Second Booking (2025-10-01 to 2025-10-03) ---");
  let room2 = await findAvailableRoom({
    roomId,
    checkIn: "2025-10-01",
    checkOut: "2025-10-03",
  });
  console.log("Resolved Room 2 ID:", room2?._id, "Status:", room2?.status);

  // Clean up
  await Room.findByIdAndUpdate(roomId, { status: "Available" });
  console.log("\nReset room status back to Available");
  
  await mongoose.connection.close();
}

simulate().catch(console.error);
