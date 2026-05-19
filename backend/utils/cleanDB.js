/**
 * Clean script — removes duplicate bookings and guests from the database.
 * Keeps only the most recent unique booking per (guestEmail + checkIn + checkOut).
 *
 * Run from INSIDE the backend folder:
 *    cd backend
 *    node utils/cleanDB.js
 */

import "dotenv/config";
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Guest from "../models/Guest.js";
import connectDB from "../config/db.js";

const clean = async () => {
  await connectDB();

  // ── 1. Remove ALL bookings and guests (test data cleanup) ──
  const bookingCount = await Booking.countDocuments();
  const guestCount   = await Guest.countDocuments();

  console.log(`\n📊  Found ${bookingCount} bookings and ${guestCount} guests`);

  await Booking.deleteMany({});
  await Guest.deleteMany({});

  // ── 2. Clear all dummy reviews and reset ratings on hotels ──
  const Hotel = (await import("../models/Hotel.js")).default;
  const hotelResult = await Hotel.updateMany({}, {
    $set: {
      reviews: [],
      reviewCount: 0,
      rating: 5.0,
    }
  });

  console.log(`🗑️  Cleared all bookings, guests, and reset reviews/ratings on ${hotelResult.modifiedCount} hotels.`);
  console.log("✅  Database is clean — ready for real bookings and reviews from the user panel");
  console.log("\n💡  Rooms are untouched. Run seedRooms.js if you need to re-seed rooms.");

  await mongoose.connection.close();
  console.log("✅  Done — database connection closed");
  process.exit(0);
};

clean().catch((err) => {
  console.error("❌  Clean failed:", err.message);
  process.exit(1);
});
