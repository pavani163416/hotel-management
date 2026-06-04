import "dotenv/config";
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

import mongoose from "mongoose";
import Coupon from "../models/Coupon.js";

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const coupons = await Coupon.find({});
  console.log("ALL COUPONS IN DB:", coupons);

  await mongoose.connection.close();
}

check().catch(console.error);
