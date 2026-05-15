import "dotenv/config";
import mongoose from "mongoose";
import User from "./models/User.js";

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const user = await User.findOne({ email: "rahima2@gmail.com" });
  if (user) {
    console.log("USER FOUND:");
    console.log("Name:", user.name);
    console.log("Profile Image:", user.profileImage);
    console.log("Cover Image:", user.coverImage);
  } else {
    console.log("USER NOT FOUND");
  }
  await mongoose.connection.close();
}

check();
