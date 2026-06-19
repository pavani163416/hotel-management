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

    // 1. Submit a review
    console.log("Submitting review...");
    const reviewRes = await axios.post(
      `http://localhost:5000/api/hotels/${hotel.hotelId}/reviews`,
      {
        rating: 5,
        comment: "Excellent hotel! Highly recommended.",
        author: user.name || "Test User"
      },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    console.log("Review submitted successfully:", reviewRes.data);

    // Verify in DB
    let hotelDoc = await Hotel.findOne({ hotelId: hotel.hotelId });
    const insertedReview = hotelDoc.reviews.find(
      r => r.userId?.toString() === userId.toString() || r.userEmail === userEmail
    );

    if (!insertedReview) {
      throw new Error("Review was not found in the database after insertion!");
    }
    console.log(`Review verified in DB. ID: ${insertedReview._id}, userId: ${insertedReview.userId}, userEmail: ${insertedReview.userEmail}`);

    const reviewId = insertedReview._id.toString();

    // 2. Edit the review
    console.log(`Editing review ${reviewId}...`);
    const editRes = await axios.put(
      `http://localhost:5000/api/hotels/${hotel.hotelId}/reviews/${reviewId}`,
      {
        rating: 4,
        comment: "Great experience, but some amenities were missing."
      },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    console.log("Review edited successfully:", editRes.data);

    // Verify updated review in DB
    hotelDoc = await Hotel.findOne({ hotelId: hotel.hotelId });
    const updatedReview = hotelDoc.reviews.id(reviewId);
    if (!updatedReview) {
      throw new Error("Review disappeared after editing!");
    }
    console.log(`Updated Review in DB - rating: ${updatedReview.rating}, comment: "${updatedReview.comment}"`);
    if (updatedReview.rating !== 4 || updatedReview.comment !== "Great experience, but some amenities were missing.") {
      throw new Error("Review updates were not persisted correctly in DB!");
    }
    console.log("Edit verification passed!");

    // 3. Delete the review
    console.log(`Deleting review ${reviewId}...`);
    const deleteRes = await axios.delete(
      `http://localhost:5000/api/hotels/${hotel.hotelId}/reviews/${reviewId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );
    console.log("Review deleted successfully:", deleteRes.data);

    // Verify deletion in DB
    hotelDoc = await Hotel.findOne({ hotelId: hotel.hotelId });
    const deletedReview = hotelDoc.reviews.id(reviewId);
    if (deletedReview) {
      throw new Error("Review still exists in DB after deletion!");
    }
    console.log("Deletion verification passed!");
    console.log("\n✅ ALL REVIEW CRUD INTEGRATION TESTS PASSED SUCCESSFULLY!");

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
