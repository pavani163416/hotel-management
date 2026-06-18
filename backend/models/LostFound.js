import mongoose from "mongoose";

const lostFoundSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true, // The user reporting or claiming the item
    },
    type: {
      type: String,
      enum: ["Lost", "Found"],
      required: true,
    },
    itemName: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ["Electronics", "Clothing", "Jewelry", "Documents", "Other"],
      default: "Other",
    },
    description: {
      type: String,
      required: true,
    },
    dateLostFound: {
      type: Date,
      required: true,
    },
    locationDetails: {
      type: String,
      required: true, // e.g., "Room 302", "Lobby", "Pool area"
    },
    status: {
      type: String,
      enum: ["Reported", "Matched", "Returned", "Closed"],
      default: "Reported",
    },
    images: {
      type: [String], // URLs of images uploaded
      default: [],
    },
    matchedWithId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LostFound",
      default: null, // If a "Lost" report matches a "Found" report, link them
    },
    adminNotes: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// Indexes for searching and filtering
lostFoundSchema.index({ hotelId: 1, status: 1 });
lostFoundSchema.index({ type: 1, category: 1 });

const LostFound = mongoose.model("LostFound", lostFoundSchema);
export default LostFound;
