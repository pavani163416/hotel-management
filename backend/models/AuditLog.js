import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    role: {
      type: String,
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    ip: {
      type: String,
      default: "unknown",
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    strict: false,
  }
);

auditLogSchema.pre("validate", function(next) {
  if (!this.action) {
    this.action = this.get("event") || this.get("action") || "UNKNOWN";
  }
  if (!this.userId) {
    this.userId = this.get("userEmail") || "anonymous";
  }
  if (!this.role) {
    this.role = "ANONYMOUS";
  }
  if (!this.ip) {
    this.ip = this.get("ipAddress") || "unknown";
  }
  next();
});

const AuditLog = mongoose.model("AuditLog", auditLogSchema);
export default AuditLog;
