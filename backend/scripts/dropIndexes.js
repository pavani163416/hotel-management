import "dotenv/config";
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

import mongoose from "mongoose";

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to DB");
  try {
    await mongoose.connection.db.collection("rooms").dropIndex("roomNumber_1");
    console.log("Index roomNumber_1 dropped successfully.");
  } catch (err) {
    console.log("Failed to drop index (it might not exist as unique, or error):", err.message);
  }
  await mongoose.connection.close();
}
run();
