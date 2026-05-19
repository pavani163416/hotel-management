/**
 * One-time cleanup script: remove seeded dummy hotel review/rating values and normalize room availability.
 * Usage: cd backend && node utils/cleanupDummyReviews.js
 */
import "dotenv/config";
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

import mongoose from "mongoose";
import Hotel from "../models/Hotel.js";
import connectDB from "../config/db.js";

const normalizeReviews = (reviews = []) => {
  return reviews
    .filter((review) => review && review.author && typeof review.rating === "number" && review.rating >= 1 && review.rating <= 5)
    .map((review) => ({
      author: String(review.author).trim(),
      rating: Number(review.rating),
      comment: String(review.comment || "").trim(),
      date: String(review.date || new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })),
    }));
};

const computeRating = (reviews) => {
  if (!reviews.length) return undefined;
  const average = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
  return Number(average.toFixed(1));
};

const cleanup = async () => {
  await connectDB();

  const hotels = await Hotel.find({});
  let updatedCount = 0;

  for (const hotel of hotels) {
    const normalizedReviews = normalizeReviews(hotel.reviews || []);
    const reviewCount = normalizedReviews.length;
    const computedRating = computeRating(normalizedReviews);

    const rooms = (hotel.rooms || []).map((room) => ({
      ...room.toObject ? room.toObject() : room,
      available: Math.max(0, Number(room.available || 0)),
    }));

    const changed = (
      hotel.reviewCount !== reviewCount ||
      hotel.rating !== computedRating ||
      hotel.reviews.length !== normalizedReviews.length ||
      rooms.some((room, index) => room.available !== (hotel.rooms?.[index]?.available ?? 0))
    );

    if (changed) {
      hotel.reviews = normalizedReviews;
      hotel.reviewCount = reviewCount;
      hotel.rating = computedRating;
      hotel.rooms = rooms;
      await hotel.save();
      updatedCount += 1;
      console.log(`Updated ${hotel.hotelId} (${hotel.name}) → reviews=${reviewCount}, rating=${computedRating ?? "unset"}`);
    } else {
      console.log(`No changes needed for ${hotel.hotelId} (${hotel.name})`);
    }
  }

  console.log(`\nCleanup completed: ${updatedCount} hotel(s) updated.`);
  await mongoose.connection.close();
  process.exit(0);
};

cleanup().catch((error) => {
  console.error("Cleanup failed:", error);
  process.exit(1);
});
