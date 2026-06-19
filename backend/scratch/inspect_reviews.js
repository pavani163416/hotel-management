import "dotenv/config";
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

import mongoose from "mongoose";
import Hotel from "../models/Hotel.js";

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const hotels = await Hotel.find({});
  for (const h of hotels) {
    console.log(`Hotel: ${h.name} (ID: ${h.hotelId}, Mongoose ID: ${h._id})`);
    console.log(`Rating: ${h.rating}, ReviewCount: ${h.reviewCount}`);
    if (h.reviews.length === 0) {
      console.log("  No reviews");
    } else {
      console.log(`  Reviews (${h.reviews.length}):`);
      for (const r of h.reviews) {
        console.log(`    - [${r.rating} stars] by ${r.author} (${r.userEmail || "no email"}): "${r.comment}" | ID: ${r._id}`);
      }
    }
    console.log();
  }

  await mongoose.connection.close();
}

run().catch(console.error);
