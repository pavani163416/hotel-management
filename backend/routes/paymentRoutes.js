import express from "express";
import {
  createOrder,
  verifyPayment,
  getPaymentStatus,
  refundPayment,
  getPaymentHistory,
} from "../controllers/paymentController.js";
import { protect, authorizeRoles } from "../middleware/auth.js";

const router = express.Router();

router.post("/create-order", protect, createOrder);
router.post("/verify", protect, verifyPayment);
router.get("/status/:orderId", protect, getPaymentStatus);
router.get("/history", protect, getPaymentHistory);

// Refund is restricted to Admins, Controllers and Managers
router.post(
  "/refund",
  protect,
  authorizeRoles("Super Admin", "admin", "Controller", "Manager", "manager"),
  refundPayment
);

export default router;
