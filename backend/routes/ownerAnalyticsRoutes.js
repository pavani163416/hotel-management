import express from "express";
import {
  getWeeklyAnalytics,
  getMonthlyAnalytics,
  getOccupancyAnalytics,
  getReviewAnalytics,
  getOverviewAnalytics
} from "../controllers/ownerAnalyticsController.js";
import { protect, authorizeRoles } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);
router.use(authorizeRoles("owner", "admin", "super admin"));

router.get("/", getOverviewAnalytics);
router.get("/weekly", getWeeklyAnalytics);
router.get("/monthly", getMonthlyAnalytics);
router.get("/occupancy", getOccupancyAnalytics);
router.get("/reviews", getReviewAnalytics);

export default router;
