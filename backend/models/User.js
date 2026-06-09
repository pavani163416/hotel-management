/**
 * User — stores customer login credentials.
 * Separate from the Guest collection (which holds booking/profile data).
 *
 * Collection: users
 *
 * Relationship:
 *   User.guestId  →  Guest._id   (linked after first booking or on register)
 *   User.email    ==  Guest.email (always kept in sync)
 */

import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type:      String,
      required:  [true, "Name is required"],
      trim:      true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },

    email: {
      type:     String,
      required: [true, "Email is required"],
      unique:   true,
      lowercase: true,
      trim:     true,
      match:    [/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Please fill a valid email address"],
    },

    passwordHash: {
      type:   String,
      required: true,
      select: false,   // never returned in queries unless explicitly requested
    },

    phone: {
      type:  String,
      trim:  true,
      default: "",
    },

    city: {
      type:  String,
      trim:  true,
      default: "",
    },
    
    profileImage: {
      type:  String,
      default: "",
    },

    coverImage: {
      type:  String,
      default: "",
    },

    wishlist: [{
      type: String,
    }],

    paymentMethods: [
      {
        type: { type: String, enum: ['card', 'upi', 'netbanking', 'debit', 'credit'], default: 'card' },
        brand: String, // For cards
        last4: String, // For cards
        expiry: String, // For cards
        upiId: String, // For UPI
        bankName: String, // For Netbanking
        isDefault: { type: Boolean, default: false },
      }
    ],

    // Link to the Guest record (created on first booking or at register time)
    guestId: {
      type:    mongoose.Schema.Types.ObjectId,
      ref:     "Guest",
      default: null,
    },

    isActive: {
      type:    Boolean,
      default: true,
    },

    isVerified: {
      type:    Boolean,
      default: false,
    },

    accountStatus: {
      type: String,
      enum: ["pending_verification", "active", "suspended", "deleted"],
      default: "pending_verification"
    },

    verificationSentAt: {
      type: Date,
      default: null,
    },

    verificationAttempts: {
      type: Number,
      default: 0,
    },

    role: {
      type:    String,
      enum:    ["customer", "owner", "manager", "admin"],
      default: "customer",
    },

    lastLogin: {
      type:    Date,
      default: null,
    },

    resetPasswordToken: {
      type:    String,
      default: null,
    },

    resetPasswordExpires: {
      type:    Date,
      default: null,
    },

    // FCM push notification token (set by mobile app after login)
    fcmToken: {
      type:    String,
      default: null,
    },

    // Owner fields
    hotelIds: [
      {
        type: String,
      },
    ],
  },
  {
    timestamps: true,
    collection: "users",
  }
);

const User = mongoose.model("User", userSchema);
export default User;
