import mongoose from "mongoose";

const housekeeperSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    pin: { type: String, required: true, default: () => Math.floor(1000 + Math.random() * 9000).toString() },
    hotelStringId: { type: String, required: true, index: true },
    hotelName: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Housekeeper = mongoose.model("Housekeeper", housekeeperSchema);
export default Housekeeper;
