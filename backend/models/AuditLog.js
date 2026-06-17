import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      index: true,
    },
    targetType: {
      type: String, // e.g., 'Waitlist', 'LostFoundRequest', 'TripPlan', 'Report'
      required: true,
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Can be customer, owner, or admin
      required: false,
    },
    role: {
      type: String,
      enum: ["customer", "owner", "admin", "superadmin", "system"],
      default: "system",
    },
    details: {
      type: mongoose.Schema.Types.Mixed, // flexible payload
      default: {},
    },
    ipAddress: {
      type: String,
    },
  },
  { timestamps: true }
);

// Index for auto-expiration (e.g. 1 year retention by default)
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 });

export default mongoose.models.AuditLog || mongoose.model("AuditLog", auditLogSchema);
