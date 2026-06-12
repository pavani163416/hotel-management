/**
 * PropertyOwner — stores hotel property owner accounts.
 * Owners can register, get KYC-verified, then manage their own hotels.
 *
 * Collection: propertyowners
 */

import mongoose from "mongoose";

const propertyOwnerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },

    passwordHash: {
      type: String,
      required: true,
      select: false,
    },

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    isPhoneVerified: {
      type: Boolean,
      default: false,
    },

    // KYC status
    kycStatus: {
      type: String,
      enum: ["not_submitted", "pending", "approved", "rejected"],
      default: "not_submitted",
    },

    // KYC documents (uploaded file URLs)
    kycDocuments: [
      {
        type: { type: String },   // e.g. "aadhar", "pan", "passport", "business_reg"
        url: String,
        public_id: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    // Approval status set by admin
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "suspended"],
      default: "pending",
    },

    // Admin notes on approval/rejection
    adminNotes: {
      type: String,
      default: "",
    },

    // Hotels owned by this owner
    hotelIds: [
      {
        type: String, // hotel.hotelId string e.g. "h1"
      },
    ],

    // OTP fields
    emailOtp: { type: String, select: false },
    emailOtpExpires: { type: Date, select: false },
    phoneOtp: { type: String, select: false },
    phoneOtpExpires: { type: Date, select: false },

    lastLogin: {
      type: Date,
      default: null,
    },

    resetPasswordToken: { type: String, default: null },
    resetPasswordExpires: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: "propertyowners",
  }
);

const PropertyOwner = mongoose.model("PropertyOwner", propertyOwnerSchema);
export default PropertyOwner;
