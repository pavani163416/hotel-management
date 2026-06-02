import express from "express";
import { processWebhook } from "../controllers/paymentController.js";

const router = express.Router();

// Public webhook endpoint for Razorpay notifications
router.post("/razorpay", processWebhook);

export default router;
