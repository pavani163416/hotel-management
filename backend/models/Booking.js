import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    // ── References ──────────────────────────────────────
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: [true, "Room reference is required"],
    },

    assignedRoom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      default: null,
    },

    roomType: {
      type: String,
      default: "Standard",
    },

    guest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Guest",
      required: [true, "Guest reference is required"],
    },

    // ── Snapshot of guest info at booking time ──────────
    // (so history stays accurate even if guest updates profile)
    guestSnapshot: {
      name: { type: String, required: true },
      email: { type: String, required: false },
      phone: { type: String, required: false },
      id: { type: String, required: true },
    },

    // ── Additional guests ────────────────────────────────
    additionalAdults: [
      {
        name: { type: String, required: true },
        id: { type: String, required: true },
        email: String,
        phone: String,
        specialRequests: String,
      },
    ],

    additionalChildren: [
      {
        name: { type: String, required: true },
        id: { type: String, required: true },
        age: Number,
      },
    ],

    totalGuests: {
      type: Number,
      default: 1,
    },

    // ── Dates ────────────────────────────────────────────
    checkIn: {
      type: Date,
      required: [true, "Check-in date is required"],
    },

    checkOut: {
      type: Date,
      required: [true, "Check-out date is required"],
    },

    // ── Pricing ──────────────────────────────────────────
    nights: {
      type: Number,
      min: [1, "Booking must be at least 1 night"],
    },

    pricePerNight: {
      type: Number,
      required: true,
    },

    subtotal: {
      type: Number,
      required: true,
    },

    taxes: {
      type: Number,
      default: 0,
    },

    discount: {
      type: Number,
      default: 0,
    },

    promoCode: {
      type: String,
      uppercase: true,
      trim: true,
    },

    totalAmount: {
      type: Number,
      required: [true, "Total amount is required"],
      min: [0, "Total amount cannot be negative"],
    },

    // ── Status ───────────────────────────────────────────
    status: {
      type: String,
      enum: {
        values: [
          "Confirmed", "Cancelled", "Completed", "Pending",
          "CheckedIn", "CheckedOut",
          "CONFIRMED", "PAYMENT_FAILED", "PAYMENT_CANCELLED", "PENDING_PAYMENT"
        ],
        message: "{VALUE} is not a valid booking status",
      },
      default: "Confirmed",
    },

    // ── Payment ──────────────────────────────────────────
    paymentMethod: {
      type: String,
      enum: ["card", "upi", "netbanking", "cash"],
      default: "card",
    },

    paymentStatus: {
      type: String,
      enum: ["PENDING", "PAID", "FAILED", "REFUNDED"],
      default: "PENDING",
      index: true,
    },

    specialRequests: {
      type: String,
      maxlength: [500, "Special requests cannot exceed 500 characters"],
    },

    // ── Hotel name snapshot ───────────────────────────────
    hotelName: {
      type: String,
      trim: true,
    },

    hotelStringId: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },

    hotelImage: {
      type: String,
      trim: true,
      default: "",
    },

    // ── Hotel ObjectId reference (for proper scoping) ─────
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      default: null,
      index: true,
    },

    // ── Check-in / Check-out tracking ────────────────────
    checkedInAt: {
      type: Date,
      default: null,
    },
    checkedOutAt: {
      type: Date,
      default: null,
    },

    // ── Walk-in flag ──────────────────────────────────────
    isWalkIn: {
      type: Boolean,
      default: false,
    },

    // ── Cancellation ─────────────────────────────────────
    cancelledAt: {
      type: Date,
    },

    cancellationReason: {
      type: String,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Pre-save: auto-calculate nights & validate dates ─────
bookingSchema.pre("save", function (next) {
  if (this.checkIn && this.checkOut) {
    if (this.checkOut <= this.checkIn) {
      return next(new Error("Check-out date must be after check-in date"));
    }
    const ms = this.checkOut.getTime() - this.checkIn.getTime();
    this.nights = Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
  }
  next();
});

// ── Virtual: formatted booking ID ────────────────────────
bookingSchema.virtual("bookingRef").get(function () {
  return `LS-${this._id.toString().slice(-5).toUpperCase()}`;
});

// ── Indexes ──────────────────────────────────────────────
bookingSchema.index({ guest: 1, status: 1 });
bookingSchema.index({ room: 1, checkIn: 1, checkOut: 1 });
bookingSchema.index({ roomType: 1 });
bookingSchema.index({ checkIn: 1 });
bookingSchema.index({ checkOut: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ hotelId: 1 });
bookingSchema.index({ createdAt: -1 });
bookingSchema.index({ hotelName: 1 });
bookingSchema.index({ status: 1, createdAt: -1 });

const Booking = mongoose.model("Booking", bookingSchema);
export default Booking;
