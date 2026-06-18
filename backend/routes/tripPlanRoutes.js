import express from "express";
import {
  getTripPlan,
  updateActivity,
  deleteActivity
} from "../controllers/tripPlanController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.use(protect);

router.get("/:bookingId", getTripPlan);
router.post("/:id/activity", updateActivity);
router.delete("/:id/activity", deleteActivity);

export default router;
