import mongoose from "mongoose";

const taskSchema = new mongoose.Schema(
  {
    roomNumber: { type: String, required: true },
    type: { type: String, enum: ["Cleaning", "Maintenance", "Inspection", "Turndown"], required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: "Housekeeper" },
    assignedToName: { type: String }, // denormalized for quick frontend display
    status: { type: String, enum: ["Pending", "In Progress", "Completed", "Blocked"], default: "Pending" },
    priority: { type: String, enum: ["High", "Medium", "Low"], default: "Medium" },
    notes: { type: String },
    hotelStringId: { type: String, required: true, index: true },
    hotelName: { type: String },
    completedAt: { type: Date }
  },
  { timestamps: true }
);

const Task = mongoose.model("Task", taskSchema);
export default Task;
