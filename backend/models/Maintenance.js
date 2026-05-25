import mongoose from "mongoose";

const maintenanceSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      required: true,
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: false,
    },
    issueType: {
      type: String,
      required: true,
      enum: ["Plumbing", "Electrical", "HVAC", "Cleaning", "General", "Other"],
    },
    description: {
      type: String,
      required: true,
    },
    reportedBy: {
      type: String, // email or user name
    },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Resolved"],
      default: "Pending",
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Critical"],
      default: "Medium",
    },
  },
  { timestamps: true }
);

export default mongoose.models.Maintenance || mongoose.model("Maintenance", maintenanceSchema);
