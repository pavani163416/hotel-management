import mongoose from "mongoose";

const roomSchema = new mongoose.Schema(
  {
    // ── Hotel reference (for proper multi-tenant scoping) ──
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      default: null,
      index: true,
    },
    // Legacy string hotel ID (e.g. "h1") — kept for backward compat
    hotelStringId: {
      type: String,
      default: null,
    },

    roomNumber: {
      type: String,
      required: [true, "Room number is required"],
      trim: true,
    },

    type: {
      type: String,
      enum: {
        values: ["Deluxe", "Suite", "Standard", "Penthouse", "Villa"],
        message: "{VALUE} is not a valid room type",
      },
      required: [true, "Room type is required"],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },

    pricePerNight: {
      type: Number,
      required: [true, "Price per night is required"],
      min: [1, "Price must be at least $1"],
    },

    capacity: {
      type: Number,
      required: [true, "Capacity is required"],
      min: [1, "Capacity must be at least 1"],
      default: 2,
    },

    bedType: {
      type: String,
      enum: ["Single", "Double", "Queen", "King", "Twin"],
      default: "King",
    },

    amenities: {
      type: [String],
      default: [],
    },

    images: {
      type: [String],
      default: [],
    },

    status: {
      type: String,
      enum: {
        values: ["Available", "Booked", "Maintenance", "Blocked", "Cleaning"],
        message: "{VALUE} is not a valid status",
      },
      default: "Available",
    },

    // Reason for blocking (set when status = "Blocked")
    blockedReason: {
      type: String,
      trim: true,
      default: null,
    },

    floor: {
      type: Number,
      min: [1, "Floor must be at least 1"],
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

roomSchema.virtual("isBookable").get(function () {
  return this.status === "Available" && this.isActive;
});

roomSchema.index({ status: 1, type: 1 });
roomSchema.index({ hotelId: 1, status: 1 });
roomSchema.index({ hotelId: 1, roomNumber: 1 }, { unique: true });

const Room = mongoose.model("Room", roomSchema);
export default Room;
