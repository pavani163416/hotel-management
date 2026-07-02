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
    const reviews = h.reviews || [];
    h.reviewCount = reviews.length;
    if (reviews.length > 0) {
      const totalRating = reviews.reduce((sum, r) => sum + (r.rating || 0), 0);
      h.rating = Number((totalRating / reviews.length).toFixed(1));
    } else {
      // Unset or set to undefined so it doesn't default to 4.5
      h.rating = undefined;
    }
    await h.save();
    console.log(`Updated "${h.name}": rating = ${h.rating}, reviewCount = ${h.reviewCount}`);
  }
  console.log("Cleanup finished successfully!");
  await mongoose.connection.close();
}

run().catch(console.error);
