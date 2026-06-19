import AuditLog from "../models/AuditLog.js";
import logger from "./logger.js";

export const logAudit = async ({ req, userId, role, action, details }) => {
  try {
    const finalUserId = userId || req?.user?.email || req?.customer?.email || "anonymous";
    const finalRole = role || req?.user?.role || req?.customer?.role || "ANONYMOUS";
    const ip = req?.ip || req?.headers?.["x-forwarded-for"] || "unknown";

    await AuditLog.create({
      userId: finalUserId,
      role: finalRole,
      action,
      targetType: "System",
      ip,
      details: details || {},
    });
  } catch (error) {
    logger.warn("Failed to create audit log entry", { error: error.message });
  }
};
