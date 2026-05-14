/**
 * FunctionHall model
 * ─────────────────────────────────────────────────────────
 * Represents a bookable event/function hall within a hotel.
 * Managed by the hotel's assigned manager.
 */
import mongoose from "mongoose";

const bookingSlotSchema = new mongoose.Schema({
  eventName:  { type: String, required: true, trim: true },
  organizer:  { type: String, trim: true },
  date:       { type: Date, required: true },
  startTime:  { type: String, required: true }, // "HH:MM"
  endTime:    { type: String, required: true },
  capacity:   { type: Number, default: 50 },
  status:     {
    type: String,
    enum: ["Confirmed", "Pending", "Cancelled"],
    default: "Confirmed",
  },
  notes:      { type: String, trim: true },
  bookedAt:   { type: Date, default: Date.now },
});

const functionHallSchema = new mongoose.Schema(
  {
    // ── Hotel reference ───────────────────────────────────
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      default: null,
    },
    hotelStringId: {
      type: String,
      default: null,
    },
    hotelName: {
      type: String,
      trim: true,
    },

    // ── Hall details ──────────────────────────────────────
    name: {
      type: String,
      required: [true, "Hall name is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    capacity: {
      type: Number,
      required: [true, "Capacity is required"],
      min: [1, "Capacity must be at least 1"],
    },
    pricePerHour: {
      type: Number,
      default: 0,
      min: [0, "Price cannot be negative"],
    },
    pricePerDay: {
      type: Number,
      default: 0,
      min: [0, "Price cannot be negative"],
    },
    amenities: {
      type: [String],
      default: [],
    },
    images: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },

    // ── Bookings ──────────────────────────────────────────
    bookings: [bookingSlotSchema],
  },
  { timestamps: true }
);

functionHallSchema.index({ hotelId: 1 });
functionHallSchema.index({ hotelStringId: 1 });

const FunctionHall = mongoose.model("FunctionHall", functionHallSchema);
export default FunctionHall;
