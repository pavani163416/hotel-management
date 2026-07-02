import "dotenv/config";
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

import mongoose from "mongoose";
import Booking from "../models/Booking.js";

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const distinctStatuses = await Booking.distinct("status");
  console.log("Distinct Booking Statuses in DB:", distinctStatuses);

  // Print counts for each status
  for (const s of distinctStatuses) {
    const count = await Booking.countDocuments({ status: s });
    console.log(`- Status: "${s}" | Count: ${count}`);
  }

  await mongoose.connection.close();
}

run().catch(console.error);
