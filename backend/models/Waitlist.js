import mongoose from "mongoose";

const waitlistSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
      index: true,
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: false, // Optional: They might waitlist the whole hotel or a specific room type
    },
    roomTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RoomType",
      required: false,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    position: {
      type: Number,
      required: true,
      default: 0,
    },
    status: {
      type: String,
      enum: ["Pending", "Notified", "Booked", "Expired", "Cancelled"],
      default: "Pending",
      index: true,
    },
    notifiedAt: {
      type: Date,
      default: null,
    },
    bookingWindowExpiresAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Compound index to ensure uniqueness and fast lookup for queue position
waitlistSchema.index({ hotelId: 1, startDate: 1, endDate: 1, status: 1 });
waitlistSchema.index({ userId: 1, hotelId: 1, startDate: 1, endDate: 1 }, { unique: true });

export default mongoose.models.Waitlist || mongoose.model("Waitlist", waitlistSchema);
