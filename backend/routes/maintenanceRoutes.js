import express from "express";
import { protect, authorizeRoles } from "../middleware/auth.js";
import {
  getMaintenanceRequests,
  createMaintenanceRequest,
  updateMaintenanceRequest,
} from "../controllers/maintenanceController.js";

const router = express.Router();

router.route("/")
  .get(protect, getMaintenanceRequests)
  .post(protect, authorizeRoles("Manager", "Super Admin", "admin"), createMaintenanceRequest);

router.route("/:id")
  .patch(protect, authorizeRoles("Manager", "Super Admin", "admin"), updateMaintenanceRequest);

export default router;
