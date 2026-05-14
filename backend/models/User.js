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
      match:    [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please provide a valid email address"],
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

    lastLogin: {
      type:    Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "users",
  }
);

const User = mongoose.model("User", userSchema);
export default User;
