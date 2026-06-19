import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "dns";
import FunctionHall from "../models/FunctionHall.js";
import Hotel from "../models/Hotel.js";

// Force IPv4 — fixes querySrv ECONNREFUSED on Windows
dns.setDefaultResultOrder("ipv4first");
try {
  dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
} catch (err) {
  console.warn("Failed to set DNS resolver fallback", err);
}

dotenv.config();

const mongoUri = process.env.MONGO_URI;

async function inspect() {
  try {
    await mongoose.connect(mongoUri, {
      family: 4
    });
    console.log("Connected to MongoDB.");

    const hotels = await Hotel.find({}, "name _id hotelId").lean();
    console.log("Existing Hotels:");
    console.log(hotels);

    const halls = await FunctionHall.find({}).lean();
    console.log("Existing Function Halls:");
    console.log(JSON.stringify(halls, null, 2));

    await mongoose.disconnect();
  } catch (err) {
    console.error(err);
  }
}

inspect();
