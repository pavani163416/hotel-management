import "dotenv/config";
import mongoose from "mongoose";
import Booking from "./models/Booking.js";
import Hotel from "./models/Hotel.js";

async function cleanup() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const hotels = await Hotel.find({}, "_id hotelId");
  const hotelIds = hotels.map(h => h._id);
  const hotelStringIds = hotels.map(h => h.hotelId).filter(Boolean);

  const res = await Booking.deleteMany({
    $and: [
      { hotelId: { $nin: hotelIds } },
      { hotelStringId: { $nin: hotelStringIds } }
    ]
  });
  console.log("Cleaned up orphaned bookings:", res.deletedCount);
  process.exit();
}

cleanup();
