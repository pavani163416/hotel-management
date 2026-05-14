import mongoose from "mongoose";

/**
 * CancellationRefund — tracks every cancelled booking and its refund status.
 * Stored in the luxestay database alongside bookings.
 */
const cancellationRefundSchema = new mongoose.Schema(
  {
    // Reference to the original booking
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      index: true,
    },

    // Snapshot of booking details at time of cancellation
    bookingRef:    { type: String },          // e.g. "LS-AB12C"
    guestName:     { type: String, required: true },
    guestEmail:    { type: String, required: true, lowercase: true },
    hotelName:     { type: String },
    roomNumber:    { type: String },
    checkIn:       { type: Date },
    checkOut:      { type: Date },
    nights:        { type: Number },

    // Financial
    originalAmount: { type: Number, required: true },  // total paid
    refundAmount:   { type: Number, default: 0 },       // amount to refund
    refundPct:      { type: Number, default: 100 },     // % of original refunded

    // Cancellation details
    cancelledBy:   { type: String, enum: ["guest", "admin", "manager", "system"], default: "guest" },
    cancelledAt:   { type: Date, default: Date.now },
    reason:        { type: String, default: "Cancelled by guest" },

    // Refund status
    refundStatus: {
      type: String,
      enum: ["pending", "processing", "completed", "failed", "not_applicable"],
      default: "pending",
    },
    refundMethod:    { type: String },   // "card", "upi", "netbanking", "cash"
    refundProcessedAt: { type: Date },
    refundReference:   { type: String }, // transaction ID from payment gateway

    // Notes
    notes: { type: String },
  },
  {
    timestamps: true,
    collection: "cancellationrefunds",
  }
);

cancellationRefundSchema.index({ guestEmail: 1 });
cancellationRefundSchema.index({ refundStatus: 1 });
cancellationRefundSchema.index({ cancelledAt: -1 });

const CancellationRefund = mongoose.model("CancellationRefund", cancellationRefundSchema);
export default CancellationRefund;
