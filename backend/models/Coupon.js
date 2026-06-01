import mongoose from "mongoose";

/**
 * Coupon — admin-managed discount codes and offers.
 * Managers can see active coupons; only admins can create/edit/delete.
 */
const couponSchema = new mongoose.Schema(
  {
    code:        { 
      type: String, 
      required: true, 
      unique: true, 
      uppercase: true, 
      trim: true,
      maxlength: 50,
      validate: {
        validator: function(v) {
          return /^[A-Z0-9_-]{1,50}$/i.test(v);
        },
        message: "Coupon code must contain only alphanumeric characters, dashes, or underscores, and be up to 50 characters long."
      }
    },
    description: { 
      type: String, 
      required: true, 
      trim: true,
      validate: {
        validator: function(v) {
          const xssPattern = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>|on\w+\s*=|javascript:/i;
          const genericHtmlPattern = /<[^>]*>/;
          return !xssPattern.test(v) && !genericHtmlPattern.test(v);
        },
        message: "description contains invalid HTML or script content."
      }
    },
    type:        { type: String, enum: ["percentage", "fixed"], default: "percentage" },
    value:       { 
      type: Number, 
      required: true,
      validate: {
        validator: function(v) {
          if (v <= 0) return false;
          if (this.type === "percentage" && v > 100) return false;
          return true;
        },
        message: "Value must be greater than 0, and percentage value cannot exceed 100%"
      }
    },   // % or flat amount
    minBookingAmount: { type: Number, default: 0 },          // minimum order value
    maxDiscount:      { type: Number, default: null },        // cap for percentage discounts

    // Scope — null means applies to all hotels
    applicableHotelIds: { type: [String], default: [] },     // empty = all hotels

    // Validity
    validFrom:   { type: Date, default: Date.now },
    validUntil:  { 
      type: Date, 
      default: null,
      validate: {
        validator: function(v) {
          if (!v) return true;
          if (this.isNew && new Date(v) <= new Date()) return false;
          return true;
        },
        message: "Coupon expiry must be in the future"
      }
    },               // null = no expiry
    usageLimit:  { 
      type: Number, 
      default: null,
      validate: {
        validator: function(v) {
          if (v === null) return true;
          return v > 0;
        },
        message: "maxUses must be greater than 0"
      }
    },
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
