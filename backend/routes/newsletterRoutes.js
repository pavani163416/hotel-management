import express from "express";
import NewsletterSubscriber from "../models/NewsletterSubscriber.js";
import { sendNotification } from "../utils/notificationService.js";

const router = express.Router();

router.post("/subscribe", async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ success: false, message: "A valid email address is required." });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Find or create subscriber
    let subscriber = await NewsletterSubscriber.findOne({ email: cleanEmail });
    if (!subscriber) {
      subscriber = await NewsletterSubscriber.create({ email: cleanEmail });
    }

    // Push notification to Admin
    await sendNotification({
      role: "admin",
      message: `New newsletter subscription: ${cleanEmail}`,
      type: "system",
    });

    res.status(200).json({ success: true, message: "Successfully subscribed to newsletter." });
  } catch (error) {
    next(error);
  }
});

export default router;
