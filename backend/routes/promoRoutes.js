/**
 * @swagger
 * tags:
 *   - name: Promo
 *     description: Promo code validation endpoints
 * /api/promo/validate:
 *   post:
 *     summary: Validate a promo coupon code
 *     tags: [Promo]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PromoValidation'
 *     responses:
 *       200:
 *         description: Promo validation result
 */

import express from "express";
import Booking from "../models/Booking.js";
import Guest   from "../models/Guest.js";
import Coupon  from "../models/Coupon.js";

const router = express.Router();

router.post("/validate", async (req, res) => {
  const { code, subtotal, userEmail } = req.body;

  if (!code || typeof code !== "string") {
    return res.status(400).json({ success: false, valid: false, message: "Promo code is required." });
  }
  if (userEmail && typeof userEmail !== "string") {
    return res.status(400).json({ success: false, valid: false, message: "Invalid userEmail format." });
  }

  const key = code.replace(/\s+/g, "").toUpperCase();
  const sub = Number(subtotal) || 0;

  // ── 1. Check DB coupons first ─────────────────────────
  try {
    const now = new Date();
    const dbCoupon = await Coupon.findOne({
      code:     key,
      isActive: true,
      $or: [{ validUntil: null }, { validUntil: { $gte: now } }],
    });

    if (dbCoupon) {
      // Check usage limit
      if (dbCoupon.usageLimit !== null && dbCoupon.usedCount >= dbCoupon.usageLimit) {
        return res.status(200).json({ success: true, valid: false, message: "This coupon has reached its usage limit." });
      }

      // Check minimum booking amount
      if (sub > 0 && sub < dbCoupon.minBookingAmount) {
        return res.status(200).json({
          success: true, valid: false,
          message: `Minimum booking amount of $${dbCoupon.minBookingAmount} required.`,
        });
      }

      // First-time check
      if (dbCoupon.firstTimeOnly && userEmail) {
        const guest = await Guest.findOne({ email: userEmail.toLowerCase().trim() });
        if (guest) {
          const bookingCount = await Booking.countDocuments({
            guest:  guest._id,
            status: { $in: ["Confirmed", "Completed", "CheckedIn", "CheckedOut"] },
          });
          if (bookingCount > 0) {
            return res.status(200).json({
              success: true, valid: false,
              message: `${key} is for first-time guests only.`,
            });
          }
        }
      }

      // Calculate discount
      let discountAmount = 0;
      if (dbCoupon.type === "percentage") {
        discountAmount = sub > 0 ? Math.round(sub * (dbCoupon.value / 100)) : 0;
        if (dbCoupon.maxDiscount) discountAmount = Math.min(discountAmount, dbCoupon.maxDiscount);
      } else {
        discountAmount = dbCoupon.value;
      }

      return res.status(200).json({
        success:       true,
        valid:         true,
        code:          key,
        discountPct:   dbCoupon.type === "percentage" ? dbCoupon.value : null,
        discountAmount,
        description:   dbCoupon.description,
        message:       dbCoupon.description,
        firstTimeOnly: dbCoupon.firstTimeOnly,
        source:        "db",
      });
    }
  } catch (err) {
    // DB error
  }

  return res.status(200).json({ success: true, valid: false, message: "Invalid promo code." });
});

export default router;
