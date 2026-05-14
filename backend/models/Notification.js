import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    userId: { type: String, default: null, index: true },
    hotelId: { type: String, default: null, index: true },
    role: {
      type: String,
      enum: ["customer", "manager", "admin"],
      required: true,
      index: true,
    },
    message: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["booking", "price", "manager", "system", "assistance"],
      default: "system",
      index: true,
    },
    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

notificationSchema.index({ role: 1, createdAt: -1 });
notificationSchema.index({ hotelId: 1, role: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, role: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);
export default Notification;
