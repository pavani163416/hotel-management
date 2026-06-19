import mongoose from "mongoose";

const ServiceItemSchema = new mongoose.Schema(
  {
    itemId: { type: String, required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, default: 1 },
  },
  { _id: false }
);

const serviceRequestSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      index: true,
      default: null,
    },
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      index: true,
      default: null,
    },
    roomNumber: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ["Housekeeping", "In-Room Dining", "Maintenance"],
      required: true,
      default: "Housekeeping",
    },
    description: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },
    items: {
      type: [ServiceItemSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Completed"],
      default: "Pending",
      index: true,
    },
    assignedTo: {
      type: String,
      trim: true,
      default: null,
    },
    ipAddress: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

serviceRequestSchema.index({ createdAt: -1 });

const ServiceRequest = mongoose.model("ServiceRequest", serviceRequestSchema);
export default ServiceRequest;
