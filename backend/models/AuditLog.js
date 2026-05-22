import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema({
  event: {
    type: String,
    required: true,
    enum: [
      "LoginFailed",
      "LoginSuccess",
      "LogoutAllDevices",
      "TokenRevoked",
      "IPAnomaly",
      "DeviceAnomaly",
      "UnauthorizedAccess",
      "AdminAction",
    ],
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  userEmail: String,
  role: String,
  ipAddress: String,
  previousIp: String,
  deviceFingerprint: String,
  previousDevice: String,
  location: String,
  description: String,
  metadata: {
    type: mongoose.Schema.Types.Mixed,
  },
  severity: {
    type: String,
    enum: ["Low", "Medium", "High", "Critical"],
    default: "Low",
  },
}, { timestamps: true });

export default mongoose.models.AuditLog || mongoose.model("AuditLog", auditLogSchema);
