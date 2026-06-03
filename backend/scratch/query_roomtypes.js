import "dotenv/config";
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

import mongoose from "mongoose";
import RoomType from "../models/RoomType.js";

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to DB");
  const types = await RoomType.find({});
  console.log("ROOM TYPES IN DB:", types);
  await mongoose.connection.close();
}
run().catch(console.error);
