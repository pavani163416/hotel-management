import express from "express";
import {
  reportItem,
  getMyReports,
  getHotelReports,
  getAllReports,
  updateReportStatus,
  deleteReport
} from "../controllers/lostFoundController.js";
import { protect, authorizeRoles } from "../middleware/auth.js";

const router = express.Router();

// User routes
router.post("/report", protect, reportItem);
router.get("/my", protect, getMyReports);
router.delete("/:id", protect, deleteReport);

// Owner/Admin routes
router.get("/hotel/:hotelId", protect, authorizeRoles("owner", "admin", "super admin"), getHotelReports);
router.put("/:id/status", protect, authorizeRoles("owner", "admin", "super admin"), updateReportStatus);

// Admin only routes
router.get("/admin", protect, authorizeRoles("admin", "super admin"), getAllReports);

export default router;
