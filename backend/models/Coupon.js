import mongoose from "mongoose";

/**
 * Coupon — admin-managed discount codes and offers.
 * Managers can see active coupons; only admins can create/edit/delete.
 */
const couponSchema = new mongoose.Schema(
  {
    code:        { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, required: true, trim: true },
    type:        { type: String, enum: ["percentage", "fixed"], default: "percentage" },
    value:       { type: Number, required: true, min: 0 },   // % or flat amount
    minBookingAmount: { type: Number, default: 0 },          // minimum order value
    maxDiscount:      { type: Number, default: null },        // cap for percentage discounts

    // Scope — null means applies to all hotels
    applicableHotelIds: { type: [String], default: [] },     // empty = all hotels

    // Validity
    validFrom:   { type: Date, default: Date.now },
    validUntil:  { type: Date, default: null },               // null = no expiry
    usageLimit:  { type: Number, default: null },             // null = unlimited
    usedCount:   { type: Number, default: 0 },

    // Audience
    firstTimeOnly: { type: Boolean, default: false },

    isActive:    { type: Boolean, default: true },
    createdBy:   { type: String, default: "admin" },
  },
  { timestamps: true, collection: "coupons" }
);

couponSchema.index({ isActive: 1 });
couponSchema.index({ validUntil: 1 });

const Coupon = mongoose.model("Coupon", couponSchema);
export default Coupon;
