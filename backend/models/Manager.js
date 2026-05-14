import mongoose from "mongoose";

const managerSchema = new mongoose.Schema(
  {
    name:            { type: String, required: true, trim: true },
    email:           { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:        { type: String, required: true },
    role:            { type: String, default: "Manager" },
    isActive:        { type: Boolean, default: true },
    lastLogin:       { type: Date },
    assignedHotelId: { type: String, default: null },
    assignedHotelName: { type: String, default: null },
    hotelObjectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hotel",
      default: null,
    },
  },
  { timestamps: true, collection: "managers" }
);

managerSchema.index({ assignedHotelId: 1 });
managerSchema.index({ isActive: 1 });

const Manager = mongoose.model("Manager", managerSchema);
export default Manager;
