import crypto from "crypto";
import Razorpay from "razorpay";
import Payment from "../models/Payment.js";
import Booking from "../models/Booking.js";
import AuditLog from "../models/AuditLog.js";
import logger from "../utils/logger.js";

// Initialize Razorpay client
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_dummy",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "dummy_secret",
});

/**
 * POST /api/payments/create-order
 * ── Create Razorpay Order ────────────────────────────────
 */
export const createOrder = async (req, res, next) => {
  try {
    const { bookingId } = req.body;
    const user = req.user; // populated by protect middleware

    if (!bookingId) {
      return res.status(400).json({ success: false, message: "Booking ID is required." });
    }

    // 1. Validate booking and ownership/user association
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found." });
    }

    // Ensure user owns this booking or has admin/manager privileges
    const userEmail = user.email?.toLowerCase().trim();
    const isOwner =
      (user.guestId && booking.guest?.toString() === user.guestId) ||
      (user.guestId && booking.guestSnapshot?.id === user.guestId) ||
      (userEmail && booking.guestSnapshot?.email?.toLowerCase().trim() === userEmail);

    const isStaff = ["Super Admin", "admin", "Controller", "Manager", "manager"].includes(user.role);

    if (!isOwner && !isStaff) {
      return res.status(403).json({ success: false, message: "Unauthorized access to booking payment." });
    }

    // 2. Determine amount from database — NEVER trust frontend amount
    const amountInINR = Math.round(booking.totalAmount);
    if (amountInINR <= 0) {
      return res.status(400).json({ success: false, message: "Invalid payment amount." });
    }

    // Check if there is already an existing successful payment for this booking
    const existingSuccess = await Payment.findOne({ bookingId, status: "SUCCESS" });
    if (existingSuccess) {
      return res.status(409).json({ success: false, message: "This booking has already been paid successfully." });
    }

    // Check if a pending payment order already exists for this booking to avoid duplicates
    const existingPending = await Payment.findOne({ bookingId, status: "PENDING" }).sort({ createdAt: -1 });
    if (existingPending) {
      // Return existing order info to prevent duplicate order generation in Razorpay
      return res.status(200).json({
        success: true,
        orderId: existingPending.razorpayOrderId,
        amount: existingPending.amount,
        currency: existingPending.currency,
      });
    }

    // 3. Create Razorpay order
    // Amount in Razorpay is in paise (1 INR = 100 paise)
    const options = {
      amount: amountInINR * 100,
      currency: "INR",
      receipt: bookingId.toString(),
    };

    let order;
    const isMockMode = !process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID === "rzp_test_dummy";

    if (isMockMode) {
      order = {
        id: `order_mock_${crypto.randomBytes(8).toString("hex")}`,
        amount: amountInINR * 100, // in paise
        currency: "INR",
      };
    } else {
      try {
        order = await razorpay.orders.create(options);
      } catch (rzpErr) {
        logger.error("Razorpay order creation failed", { error: rzpErr.message });
        return res.status(502).json({ success: false, message: "Payment gateway error. Unable to initialize order." });
      }
    }

    // 4. Save Payment record in database as PENDING
    const payment = await Payment.create({
      bookingId: booking._id,
      userId: user.email || user.guestId || "unknown",
      razorpayOrderId: order.id,
      amount: amountInINR,
      currency: "INR",
      status: "PENDING",
    });

    // Write audit log
    AuditLog.create({
      event: "PaymentOrderCreated",
      userId: user.id,
      userEmail: user.email,
      role: user.role,
      description: `Razorpay order ${order.id} created for booking ${booking._id} with amount ${amountInINR} INR (Mock Mode: ${isMockMode})`,
    }).catch(() => {});

    return res.status(201).json({
      success: true,
      orderId: order.id,
      amount: order.amount, // in paise
      currency: order.currency,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/payments/verify
 * ── Payment Verification API ──────────────────────────────
 */
export const verifyPayment = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Missing required verification credentials (order_id, payment_id, signature).",
      });
    }

    const isMockMode = !process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID === "rzp_test_dummy";

    if (isMockMode && razorpay_order_id.startsWith("order_mock_")) {
      logger.info("Mock payment verification signature bypassed in Sandbox Mode", { razorpay_order_id });
    } else {
      // 1. Signature Verification (HMAC SHA256)
      const secret = process.env.RAZORPAY_KEY_SECRET || "dummy_secret";
      const generatedSignature = crypto
        .createHmac("sha256", secret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      if (generatedSignature !== razorpay_signature) {
        logger.warn("Invalid payment signature received", { razorpay_order_id, razorpay_payment_id });
        return res.status(400).json({ success: false, message: "Payment verification failed. Invalid signature." });
      }
    }

    // 2. Idempotency Protection: check if payment is already processed successfully
    const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment record not found." });
    }

    if (payment.status === "SUCCESS") {
      // Already verified via webhook or previous callback
      return res.status(200).json({ success: true, message: "Payment verified successfully (already processed)." });
    }

    // Check if the payment ID is unique
    const duplicatePayment = await Payment.findOne({ razorpayPaymentId: razorpay_payment_id });
    if (duplicatePayment) {
      return res.status(409).json({ success: false, message: "Payment ID has already been verified." });
    }

    // Update payment record to SUCCESS
    payment.status = "SUCCESS";
    payment.razorpayPaymentId = razorpay_payment_id;
    await payment.save();

    // 3. Update Booking payment status
    await Booking.findByIdAndUpdate(payment.bookingId, {
      paymentStatus: "PAID",
      status: "Confirmed",
    });

    // Write audit log
    AuditLog.create({
      event: "PaymentVerified",
      userId: req.user?.id,
      userEmail: req.user?.email,
      role: req.user?.role,
      description: `Razorpay payment ${razorpay_payment_id} verified successfully for order ${razorpay_order_id}`,
    }).catch(() => {});

    return res.status(200).json({
      success: true,
      message: "Payment verified and booking confirmed successfully.",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/payments/status/:orderId
 * ── Retrieve payment status ──────────────────────────────
 */
export const getPaymentStatus = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const payment = await Payment.findOne({ razorpayOrderId: orderId }).populate("bookingId");
    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment order not found." });
    }

    return res.status(200).json({
      success: true,
      data: {
        orderId: payment.razorpayOrderId,
        paymentId: payment.razorpayPaymentId,
        amount: payment.amount,
        status: payment.status,
        bookingStatus: payment.bookingId?.status || "Unknown",
        paymentStatus: payment.bookingId?.paymentStatus || "Unknown",
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/webhooks/razorpay
 * ── Webhook processing ────────────────────────────────────
 */
export const processWebhook = async (req, res, next) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "dummy_webhook_secret";
    const signature = req.headers["x-razorpay-signature"];

    if (!signature) {
      return res.status(400).json({ success: false, message: "Missing webhook signature header." });
    }

    // Validate Webhook Signature
    const shasum = crypto.createHmac("sha256", webhookSecret);
    shasum.update(JSON.stringify(req.body));
    const digest = shasum.digest("hex");

    if (digest !== signature) {
      logger.warn("Invalid webhook signature", { receivedSignature: signature });
      return res.status(400).json({ success: false, message: "Invalid webhook signature." });
    }

    const event = req.body.event;
    const payload = req.body.payload;

    logger.info("Razorpay webhook received", { event });

    if (event === "order.paid" || event === "payment.captured") {
      const paymentEntity = payload.payment.entity;
      const orderId = paymentEntity.order_id;
      const paymentId = paymentEntity.id;

      const payment = await Payment.findOne({ razorpayOrderId: orderId });
      if (payment) {
        if (payment.status !== "SUCCESS") {
          payment.status = "SUCCESS";
          payment.razorpayPaymentId = paymentId;
          await payment.save();

          await Booking.findByIdAndUpdate(payment.bookingId, {
            paymentStatus: "PAID",
            status: "Confirmed",
          });

          logger.info("Payment marked SUCCESS via Webhook", { orderId, paymentId });
        }
      }
    } else if (event === "payment.failed") {
      const paymentEntity = payload.payment.entity;
      const orderId = paymentEntity.order_id;
      const errorDescription = paymentEntity.error_description || "Payment failed at gateway";

      const payment = await Payment.findOne({ razorpayOrderId: orderId });
      if (payment && payment.status === "PENDING") {
        payment.status = "FAILED";
        payment.failureReason = errorDescription;
        await payment.save();

        await Booking.findByIdAndUpdate(payment.bookingId, {
          paymentStatus: "FAILED",
        });

        logger.info("Payment marked FAILED via Webhook", { orderId, reason: errorDescription });
      }
    } else if (event === "refund.processed") {
      const refundEntity = payload.refund.entity;
      const paymentId = refundEntity.payment_id;

      const payment = await Payment.findOne({ razorpayPaymentId: paymentId });
      if (payment) {
        payment.status = "REFUNDED";
        await payment.save();

        await Booking.findByIdAndUpdate(payment.bookingId, {
          paymentStatus: "REFUNDED",
          status: "Cancelled",
        });

        logger.info("Payment marked REFUNDED via Webhook", { paymentId });
      }
    }

    // Acknowledge receipt of webhook
    return res.status(200).json({ success: true, message: "Webhook processed." });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/payments/refund
 * ── Refund API (Admin/Manager only) ────────────────────────
 */
export const refundPayment = async (req, res, next) => {
  try {
    const { paymentId, amount } = req.body;
    const user = req.user; // populated by protect middleware

    if (!paymentId) {
      return res.status(400).json({ success: false, message: "Payment ID (Razorpay ID) is required." });
    }

    // Find the successful payment record
    const payment = await Payment.findOne({ razorpayPaymentId: paymentId });
    if (!payment) {
      return res.status(404).json({ success: false, message: "Payment record not found." });
    }

    if (payment.status !== "SUCCESS") {
      return res.status(400).json({ success: false, message: `Only successful payments can be refunded. Current status: ${payment.status}` });
    }

    // Create refund options
    const refundOptions = {
      payment_id: paymentId,
    };
    if (amount) {
      refundOptions.amount = Math.round(amount) * 100; // in paise
    }

    let refund;
    try {
      refund = await razorpay.payments.refund(paymentId, refundOptions);
    } catch (rzpErr) {
      logger.error("Razorpay refund request failed", { error: rzpErr.message });
      return res.status(502).json({ success: false, message: `Refund failed: ${rzpErr.message}` });
    }

    // Update payment record to REFUNDED
    payment.status = "REFUNDED";
    await payment.save();

    // Cancel the booking and mark paymentStatus as REFUNDED
    await Booking.findByIdAndUpdate(payment.bookingId, {
      paymentStatus: "REFUNDED",
      status: "Cancelled",
    });

    // Write audit log
    AuditLog.create({
      event: "PaymentRefunded",
      userId: user.id,
      userEmail: user.email,
      role: user.role,
      description: `Razorpay payment ${paymentId} refunded successfully. Refund ID: ${refund.id}`,
    }).catch(() => {});

    return res.status(200).json({
      success: true,
      message: "Refund processed successfully.",
      refundId: refund.id,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/payments/history
 * ── Payment History ───────────────────────────────────────
 */
export const getPaymentHistory = async (req, res, next) => {
  try {
    const user = req.user;
    let filter = {};

    const isStaff = ["Super Admin", "admin", "Controller", "Manager", "manager"].includes(user.role);
    if (!isStaff) {
      // Customers can only see their own payment history
      filter.userId = user.email || user.guestId || "unknown";
    }

    const payments = await Payment.find(filter)
      .populate("bookingId")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: payments.length,
      data: payments,
    });
  } catch (error) {
    next(error);
  }
};
