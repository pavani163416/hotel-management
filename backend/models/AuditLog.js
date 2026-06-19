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
  {
    timestamps: true,
    strict: false,
  }
);

// Pre-validation hook to ensure backward compatibility with older logs.
auditLogSchema.pre("validate", function (next) {
  if (!this.action) {
    this.action = this.get("event") || this.get("action") || "UNKNOWN";
  }
  if (!this.targetType) {
    this.targetType = "System";
  }
  
  // Clean up role if it doesn't match enum
  if (this.role && !["customer", "owner", "admin", "superadmin", "system"].includes(this.role)) {
    if (!this.details) this.details = {};
    this.details.originalRole = this.role;
    this.role = "system";
  }

  // Backup legacy fields to details
  const legacyFields = [
    "event",
    "description",
    "severity",
    "userEmail",
    "deviceFingerprint",
    "previousIp",
    "previousDevice",
    "ip",
  ];
  legacyFields.forEach((field) => {
    const val = this.get(field);
    if (val !== undefined) {
      if (!this.details) this.details = {};
      this.details[field] = val;
    }
  });

  // Map legacy IP field
  if (!this.ipAddress && this.get("ip")) {
    this.ipAddress = this.get("ip");
  }

  next();
});

// Index for auto-expiration (e.g. 1 year retention by default)
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 31536000 });

export default mongoose.models.AuditLog || mongoose.model("AuditLog", auditLogSchema);


