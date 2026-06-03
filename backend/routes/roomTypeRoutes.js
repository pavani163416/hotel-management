import express from "express";
import { getRoomTypes, createRoomType, updateRoomType, deleteRoomType } from "../controllers/roomTypeController.js";
import { protect, authorizeRoles } from "../middleware/auth.js";

const router = express.Router();

router.route("/")
  .get(getRoomTypes)
  .post(protect, authorizeRoles("admin", "Super Admin"), createRoomType);

router.route("/:id")
  .patch(protect, authorizeRoles("admin", "Super Admin"), updateRoomType)
  .delete(protect, authorizeRoles("admin", "Super Admin"), deleteRoomType);

export default router;
