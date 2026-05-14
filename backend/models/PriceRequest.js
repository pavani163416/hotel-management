/**
 * PriceRequest model
 * ─────────────────────────────────────────────────────────
 * Manager submits a price change request for a room.
 * Admin approves or rejects it.
 * On approval, the room's pricePerNight is updated automatically.
 */
import mongoose from "mongoose";

const priceRequestSchema = new mongoose.Schema(
  {
    // ── References ────────────────────────────────────────
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      default: null,
    },
    // Legacy string hotel ID (e.g. "h1") for backward compat
    hotelStringId: {
      type: String,
      default: null,
    },
    hotelName: {
      type: String,
      trim: true,
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: [true, "Room reference is required"],
    },
    roomNumber: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdminUser",
      required: [true, "Manager reference is required"],
    },
    createdByName: {
      type: String,
      trim: true,
    },

    // ── Pricing ───────────────────────────────────────────
    currentPrice: {
      type: Number,
      required: [true, "Current price is required"],
      min: [1, "Price must be at least $1"],
    },
    requestedPrice: {
      type: Number,
      required: [true, "Requested price is required"],
      min: [1, "Price must be at least $1"],
    },

    // ── Reason ────────────────────────────────────────────
    reason: {
      type: String,
      trim: true,
      maxlength: [500, "Reason cannot exceed 500 characters"],
    },

    // ── Effective date ────────────────────────────────────
    effectiveDate: {
      type: Date,
      default: null,
    },

    // ── Status ────────────────────────────────────────────
    status: {
      type: String,
      enum: {
        values: ["pending", "approved", "rejected"],
        message: "{VALUE} is not a valid status",
      },
      default: "pending",
    },

    // ── Admin action ──────────────────────────────────────
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AdminUser",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewNote: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { timestamps: true }
);

priceRequestSchema.index({ hotelId: 1, status: 1 });
priceRequestSchema.index({ hotelStringId: 1, status: 1 });
priceRequestSchema.index({ createdBy: 1 });
priceRequestSchema.index({ roomId: 1 });

const PriceRequest = mongoose.model("PriceRequest", priceRequestSchema);
export default PriceRequest;
