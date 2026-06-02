import mongoose from "mongoose";

const guestSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Guest name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        "Please fill a valid email address",
      ],
    },

    phone: {
      type: String,
      trim: true,
      default: "",
    },

    city: {
      type: String,
      trim: true,
    },
    profileImage: {
      type: String,
      default: "",
    },
    coverImage: {
      type: String,
      default: "",
    },

    // Optional: set when guest creates an account via /api/auth/register
    passwordHash: {
      type: String,
      default: null,
      select: false,   // never returned in queries unless explicitly selected
    },

    // Tracks all bookings made by this guest
    bookings: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Booking",
      },
    ],
  },
  {
    timestamps: true,
  }
);

// ── Index already set via unique:true above ───────────────
// guestSchema.index({ email: 1 });

const Guest = mongoose.model("Guest", guestSchema);
export default Guest;
