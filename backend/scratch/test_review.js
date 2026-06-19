import mongoose from "mongoose";
import dotenv from "dotenv";
import dns from "dns";
import User from "../models/User.js";
import Hotel from "../models/Hotel.js";
import axios from "axios";
import bcrypt from "bcryptjs";

dns.setDefaultResultOrder("ipv4first");
try {
  dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
} catch (err) {}

dotenv.config();

const mongoUri = process.env.MONGO_URI;

async function testReview() {
  try {
    await mongoose.connect(mongoUri, { family: 4 });
    const user = await User.findOne({ role: "customer" });
    if (!user) {
      console.error("No customer user found in database!");
      await mongoose.disconnect();
      return;
    }
    console.log(`Found customer: ${user.email}`);

    // Update passwordHash to 'password123'
    const passwordHash = await bcrypt.hash("password123", 12);
    await User.updateOne({ _id: user._id }, { $set: { passwordHash: passwordHash } });
    console.log("Updated test user passwordHash in database.");

    const hotel = await Hotel.findOne({ isActive: true });
    if (!hotel) {
      console.error("No active hotel found!");
      await mongoose.disconnect();
      return;
    }
    console.log(`Found hotel: ${hotel.name} (${hotel.hotelId})`);

    // Clean up any existing review by this user on this hotel to prevent 409
    const userEmail = user.email.toLowerCase().trim();
    const userId = user._id;

    const pullResult = await Hotel.updateOne(
      { _id: hotel._id },
      {
        $pull: {
          reviews: {
            $or: [
              { userId: userId },
              { userEmail: userEmail }
            ]
          }
        }
      }
    );
    console.log(`Cleaned up existing reviews. Matched/Modified: ${pullResult.matchedCount}/${pullResult.modifiedCount}`);

    // Log in
    const loginRes = await axios.post("http://localhost:5000/api/auth/login", {
      email: user.email,
      password: "password123"
    });

    const token = loginRes.data.data.token;
    console.log(`Logged in successfully, token: ${token.substring(0, 15)}...`);

    // Now try to submit a review
    console.log("Submitting review...");
    const reviewRes = await axios.post(
      `http://localhost:5000/api/hotels/${hotel.hotelId}/reviews`,
      {
        rating: 5,
        comment: "Excellent hotel! Highly recommended.",
        author: "John Doe"
      },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    console.log("Review submitted successfully:", reviewRes.data);
    await mongoose.disconnect();
  } catch (err) {
    if (err.response) {
      console.error("API Error Response Status:", err.response.status);
      console.log("API Error Response Data:", err.response.data);
    } else {
      console.error("Error:", err.message);
    }
    try { await mongoose.disconnect(); } catch {}
  }
}

testReview();
