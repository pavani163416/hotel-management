import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/User.js";

dotenv.config();

async function checkUser() {
  await mongoose.connect(process.env.MONGO_URI);
  const user = await User.findOne({ email: "rahima2@gmail.com" });
  console.log("USER RECORD:", JSON.stringify(user, null, 2));
  process.exit(0);
}

checkUser();
