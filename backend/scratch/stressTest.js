import "dotenv/config";
import mongoose from "mongoose";
import Hotel from "../models/Hotel.js";
import Booking from "../models/Booking.js";
import connectDB from "../config/db.js";
import crypto from "crypto";

async function runStressTest() {
  console.log("=== AthithiGriha Overbooking Stress Test (50 Concurrent Requests) ===\n");
  await connectDB();

  const testSuffix = crypto.randomInt(100000, 999999).toString();
  const hotelId = `h_stress_${testSuffix}`;

  // 1. Create a hotel with capacity of 10 standard rooms
  await Hotel.create({
    hotelId,
    name: `Stress Test Hotel ${testSuffix}`,
    location: "Stress Blvd",
    city: "StressCity",
    pricePerNight: 500,
    roomInventory: {
      standard: { total: 10, price: 500 }
    }
  });
  console.log("✔ Created stress hotel. Standard Capacity = 10.");

  const checkIn = new Date("2026-08-01");
  const checkOut = new Date("2026-08-05");

  // 2. Fire 50 concurrent booking operations
  console.log("⚡ Launching 50 concurrent bookings...");

  const promises = Array.from({ length: 50 }).map(async (_, idx) => {
    let retries = 15;
    while (retries > 0) {
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        const actualHotel = await Hotel.findOne({ hotelId }).session(session);
        const inv = actualHotel.roomInventory.get("standard");
        const capacity = inv.total;

        // Write lock the hotel document to force serial execution of bookings for this hotel
        await Hotel.updateOne({ _id: actualHotel._id }, { $set: { updatedAt: new Date() } }).session(session);

        const activeBookingsCount = await Booking.countDocuments({
          hotelStringId: hotelId,
          roomType: "standard",
          status: { $in: ["Confirmed", "CheckedIn", "Pending"] },
          checkIn: { $lt: checkOut },
          checkOut: { $gt: checkIn }
        }).session(session);

        if (activeBookingsCount >= capacity) {
          await session.abortTransaction();
          session.endSession();
          return { success: false, message: "No rooms available", index: idx };
        }

        const booking = await Booking.create(
          [
            {
              room: new mongoose.Types.ObjectId(),
              guest: new mongoose.Types.ObjectId(),
              guestSnapshot: { name: `Stress Guest ${idx}`, id: `g_${idx}` },
              checkIn,
              checkOut,
              pricePerNight: 500,
              subtotal: 2000,
              totalAmount: 2000,
              roomType: "standard",
              hotelStringId: hotelId,
              status: "Confirmed",
            }
          ],
          { session }
        );

        await session.commitTransaction();
        session.endSession();
        return { success: true, bookingId: booking[0]._id, index: idx };
      } catch (err) {
        await session.abortTransaction();
        session.endSession();

        const isWriteConflict = err.message.includes("WriteConflict") || err.code === 112;
        if (isWriteConflict && retries > 1) {
          retries--;
          await new Promise(r => setTimeout(r, crypto.randomInt(50, 300)));
          continue;
        }
        return { success: false, error: err.message, index: idx };
      }
    }
    return { success: false, error: "Max retries exceeded", index: idx };
  });

  const results = await Promise.all(promises);

  const successes = results.filter(r => r.success);
  const failures = results.filter(r => !r.success);

  console.log(`\nStress Test Results:`);
  console.log(`- Successes: ${successes.length} (Expected exactly 10)`);
  console.log(`- Failures: ${failures.length} (Expected exactly 40)`);

  // Assertions
  if (successes.length === 10 && failures.length === 40) {
    console.log("\n✔ SUCCESS: Transaction isolation prevented overbooking! No standard capacity limit was breached.");
  } else {
    console.error(`\n❌ FAILURE: Standard capacity breached or unexpected counts. Successes: ${successes.length}`);
  }

  // Clean up
  await Hotel.deleteOne({ hotelId });
  await Booking.deleteMany({ hotelStringId: hotelId });
  await mongoose.connection.close();
}

runStressTest();
