import mongoose from "mongoose";

const tripPlanSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
    },
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
    },
    title: {
      type: String,
      required: true,
      default: "My Trip Itinerary",
    },
    days: [
      {
        date: {
          type: Date,
          required: true,
        },
        activities: [
          {
            time: { type: String, required: true }, // e.g., "09:00 AM"
            type: { type: String, enum: ["Dining", "Activity", "Sightseeing", "Travel", "Other"], default: "Activity" },
            title: { type: String, required: true },
            description: { type: String, default: "" },
            location: { type: String, default: "" },
            cost: { type: Number, default: 0 },
            isCompleted: { type: Boolean, default: false },
          }
        ],
      }
    ],
  },
  { timestamps: true }
);

// Index to easily fetch user's itineraries
tripPlanSchema.index({ userId: 1, bookingId: 1 });

const TripPlan = mongoose.model("TripPlan", tripPlanSchema);
export default TripPlan;
