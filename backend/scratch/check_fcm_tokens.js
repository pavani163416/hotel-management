import "dotenv/config";
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

import mongoose from "mongoose";
import User from "../models/User.js";

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const users = await User.find({ fcmToken: { $ne: null } });
  console.log(`Found ${users.length} users with FCM tokens:`);
  for (const u of users) {
    console.log(`- User: ${u.name} | Email: ${u.email} | Role: ${u.role} | fcmToken: ${u.fcmToken}`);
  }

  const allUsers = await User.find({});
  console.log(`Total users in DB: ${allUsers.length}`);
  const rolesCount = {};
  for (const u of allUsers) {
    rolesCount[u.role] = (rolesCount[u.role] || 0) + 1;
  }
  console.log("Roles breakdown:", rolesCount);

  await mongoose.connection.close();
}

run().catch(console.error);
