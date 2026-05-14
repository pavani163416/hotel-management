/**
 * AdditionalGuest model — stored in luxestay DB
 * Tracks extra adults and children added during booking
 */
import mongoose from "mongoose";

const additionalGuestSchema = new mongoose.Schema(
  {
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    leadGuestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Guest",
    },
    leadGuestName:  { type: String },
    leadGuestEmail: { type: String },

    // Additional adults
    adults: [
      {
        name:            { type: String, required: true },
        email:           { type: String },
        phone:           { type: String },
        specialRequests: { type: String },
      },
    ],

    // Children
    children: [
      {
        name: { type: String, required: true },
        age:  { type: Number },
      },
    ],

    hotelName:  { type: String },
    roomNumber: { type: String },
    checkIn:    { type: Date },
    checkOut:   { type: Date },
  },
  { timestamps: true }
);

additionalGuestSchema.index({ bookingId: 1 });
additionalGuestSchema.index({ leadGuestEmail: 1 });

const AdditionalGuest = mongoose.model("AdditionalGuest", additionalGuestSchema);
export default AdditionalGuest;
