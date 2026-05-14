import express from "express";
import { getNotifications, markNotificationRead, createNotification } from "../controllers/notificationController.js";

const router = express.Router();

router.get("/", getNotifications);
router.post("/", createNotification);
router.put("/:id/read", markNotificationRead);

export default router;
