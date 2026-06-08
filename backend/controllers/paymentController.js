import crypto from "crypto";
import Razorpay from "razorpay";
import Payment from "../models/Payment.js";
import Booking from "../models/Booking.js";
import AuditLog from "../models/AuditLog.js";
import logger from "../utils/logger.js";
import { sendNotification } from "../utils/notificationService.js";
import { sendBookingConfirmation } from "../utils/emailService.js";
import { logAudit } from "../utils/auditLogger.js";

// Initialize Razorpay client
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_dummy",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "dummy_secret",
});

// Helper to wrap Razorpay SDK calls in a promise with a timeout (default 8000ms)
const callRazorpayWithTimeout = (promise, ms = 8000) => {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Razorpay API call timed out after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeoutPromise]);
};

/**
 * POST /api/payments/create-order
 * ── Create Razorpay Order ────────────────────────────────
 */
export const createOrder = async (req, res, next) => {
  try {
    const { bookingId } = req.body;
    const user = req.user; // populated by protect middleware

    if (!bookingId) {
      logger.warn("Payment order creation rejected: Booking ID is missing.");
      return res.status(400).json({ success: false, message: "Booking ID is required." });
    }

    logger.info("Payment order creation request received", { bookingId, userId: user.id || user.email });

    // 1. Validate booking and ownership/user association
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      logger.warn("Payment order creation failed: Booking not found.", { bookingId });
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
      logger.warn("Payment order creation unauthorized", { bookingId, userId: user.id || user.email });
      return res.status(403).json({ success: false, message: "Unauthorized access to booking payment." });
    }

    // 2. Determine amount from database — NEVER trust frontend amount
    const amountInINR = Math.round(booking.totalAmount);
    if (amountInINR <= 0) {
      logger.warn("Payment order creation rejected: invalid total amount", { bookingId, amountInINR });
      return res.status(400).json({ success: false, message: "Invalid payment amount." });
    }

    // Check if there is already an existing successful payment for this booking
    const existingSuccess = await Payment.findOne({ bookingId, status: "SUCCESS" });
    if (existingSuccess) {
      logger.warn("Payment order creation skipped: Booking already paid successfully", { bookingId });
      return res.status(409).json({ success: false, message: "This booking has already been paid successfully." });
    }

    // Check if a pending payment order already exists for this booking to avoid duplicates
    const existingPending = await Payment.findOne({ bookingId, status: "PENDING" }).sort({ createdAt: -1 });
    if (existingPending) {
      logger.info("Reusing existing pending payment order", { bookingId, orderId: existingPending.razorpayOrderId });
      // Return existing order info to prevent duplicate order generation in Razorpay
      return res.status(200).json({
        success: true,
        orderId: existingPending.razorpayOrderId,
        amount: existingPending.amount * 100,
        currency: existingPending.currency,
        key: process.env.RAZORPAY_KEY_ID || "rzp_test_dummy",
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
      logger.info("Generating mock Razorpay order (Sandbox Mode)", { bookingId, amount: options.amount });
      order = {
        id: `order_mock_${crypto.randomBytes(8).toString("hex")}`,
        amount: amountInINR * 100, // in paise
        currency: "INR",
      };
    } else {
      try {
        logger.info("Initiating Live Razorpay API order creation", { bookingId, amount: options.amount });
        order = await callRazorpayWithTimeout(razorpay.orders.create(options), 8000);
      } catch (rzpErr) {
        logger.error("Razorpay order creation failed at gateway", { error: rzpErr.message, bookingId });
        return res.status(502).json({ success: false, message: "Payment gateway error. Unable to initialize order." });
      }
    }

    logger.info("Payment order successfully created", { bookingId, orderId: order.id, isMockMode });

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
      key: process.env.RAZORPAY_KEY_ID || "rzp_test_dummy",
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
      logger.warn("Payment verification failed: missing verification credentials", {
        razorpay_order_id,
        hasPaymentId: !!razorpay_payment_id,
        hasSignature: !!razorpay_signature,
      });
      return res.status(400).json({
        success: false,
        message: "Missing required verification credentials (order_id, payment_id, signature).",
      });
    }

    logger.info("Payment signature verification start", { razorpay_order_id, razorpay_payment_id });

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
        logger.warn("Verification failure: invalid payment signature", { razorpay_order_id, razorpay_payment_id });
        return res.status(400).json({ success: false, message: "Payment verification failed. Invalid signature." });
      }
    }

    // Verify payment record exists in the database
    const payment = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
    if (!payment) {
      logger.error("Verification failure: payment record not found in database", { razorpay_order_id });
      return res.status(404).json({ success: false, message: "Payment record not found." });
    }

    logger.info("Payment signature verified successfully", { razorpay_order_id, paymentId: payment._id });

    return res.status(200).json({
      success: true,
      message: "Payment signature verified successfully. Awaiting authoritative webhook reconciliation.",
    });
  } catch (error) {
    logger.error("Error during payment verification", { error: error.message, razorpay_order_id: req.body?.razorpay_order_id });
    next(error);
  }
};

/**
 * POST /api/payments/cancel
 * ── Payment Cancellation (user dismissed Razorpay modal) ──────────────────
 * Called by frontend when the user closes the Razorpay checkout modal without
 * completing payment. Marks payment as CANCELLED and releases the room.
 */
export const cancelPayment = async (req, res, next) => {
  try {
    const { orderId, bookingId } = req.body;
    const user = req.user;

    if (!orderId && !bookingId) {
      return res.status(400).json({ success: false, message: "orderId or bookingId is required." });
    }

    logger.info("Payment cancellation request received", { orderId, bookingId, userId: user?.email });

    // ── Step 1: Find and mark the pending Payment record ─────────────────
    let payment = null;
    if (orderId) {
      payment = await Payment.findOne({ razorpayOrderId: orderId, status: "PENDING" });
    }
    if (!payment && bookingId) {
      payment = await Payment.findOne({ bookingId, status: "PENDING" }).sort({ createdAt: -1 });
    }

    if (payment) {
      payment.status = "CANCELLED";
      payment.failureReason = "Cancelled by user (modal dismissed)";
      await payment.save();
    }

    // ── Step 2: Find the Booking — either via Payment.bookingId or direct bookingId ──
    let targetBookingId = payment?.bookingId?.toString() || bookingId;
    let booking = null;
    if (targetBookingId) {
      try {
        booking = await Booking.findById(targetBookingId);
      } catch (_) {
        // Invalid ObjectId — ignore
      }
    }

    if (booking && booking.status !== "Cancelled" && booking.status !== "Confirmed" && booking.status !== "CONFIRMED") {
      booking.status = "PAYMENT_CANCELLED";
      booking.paymentStatus = "FAILED";
      booking.cancellationReason = "Payment cancelled by user";
      booking.cancelledAt = new Date();
      await booking.save();

      // ── EVENT 4 – PAYMENT CANCELLED ──
      sendNotification({
        userId: booking.guestSnapshot?.email || payment?.userId || user?.email || null,
        role: "customer",
        message: `Your payment for booking ${booking.bookingRef} was cancelled. You may retry payment anytime.`,
        type: "booking"
      }).catch(() => {});

      sendNotification({
        role: "admin",
        message: `User cancelled payment for booking ${booking.bookingRef}.`,
        type: "booking"
      }).catch(() => {});

      sendNotification({
        hotelId: booking.hotelStringId || booking.hotelId?.toString() || null,
        role: "manager",
        message: `Booking ${booking.bookingRef} moved to PAYMENT_CANCELLED.`,
        type: "booking"
      }).catch(() => {});

      // Release the room
      try {
        const { syncRoomLegacyStatus } = await import("../services/roomAllocationService.js");
        await syncRoomLegacyStatus(booking.room).catch(() => {});
      } catch (_) { /* service may not exist in all envs */ }

      // Emit room release update
      const io = req.app.get("io");
      if (io) {
        io.emit("roomStatusUpdate", { roomId: booking.room, hotelStringId: booking.hotelStringId });
        io.emit("booking_update", { _id: booking._id, status: "PAYMENT_CANCELLED" });
      }

      logger.info("Payment cancelled and room released", {
        orderId: payment?.razorpayOrderId,
        bookingId: booking._id,
        userId: user?.email,
      });
    } else if (!booking) {
      logger.warn("cancelPayment: no booking found to cancel", { orderId, bookingId });
    }

    return res.status(200).json({ success: true, message: "Payment cancelled. Room is now available." });
  } catch (error) {
    logger.error("Error during payment cancellation", { error: error.message });
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
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      logger.error("RAZORPAY_WEBHOOK_SECRET is not configured on this server.");
      return res.status(500).json({ success: false, message: "Webhook secret not configured." });
    }

    const signature = req.headers["x-razorpay-signature"];
    if (!signature) {
      logger.warn("Webhook attempt rejected: Missing x-razorpay-signature header.");
      return res.status(401).json({ success: false, message: "Unauthorized: Missing signature." });
    }

    // Verify signature using raw body (req.rawBody)
    if (!req.rawBody) {
      logger.warn("Webhook attempt rejected: raw request body is not available.");
      return res.status(400).json({ success: false, message: "Raw body is missing." });
    }

    const shasum = crypto.createHmac("sha256", webhookSecret);
    shasum.update(req.rawBody);
    const digest = shasum.digest("hex");

    if (digest !== signature) {
      logger.warn("Webhook signature verification failed.", { receivedSignature: signature, generatedDigest: digest });
      return res.status(401).json({ success: false, message: "Unauthorized: Signature mismatch." });
    }

    const eventObj = req.body;
    const eventId = eventObj.id;
    const eventType = eventObj.event;

    if (!eventId || !eventType) {
      return res.status(400).json({ success: false, message: "Invalid payload: missing event ID or type." });
    }

    // supported events
    const supportedEvents = [
      "payment.authorized",
      "payment.captured",
      "payment.failed",
      "refund.created",
      "refund.processed",
      "order.paid"
    ];

    if (!supportedEvents.includes(eventType)) {
      logger.info(`Ignored unsupported webhook event: ${eventType}`);
      return res.status(200).json({ success: true, message: `Event ${eventType} ignored safely.` });
    }

    // Idempotency Protection: write event to WebhookEvent
    const WebhookEvent = (await import("../models/WebhookEvent.js")).default;
    try {
      await WebhookEvent.create({ eventId, eventType, processedAt: new Date() });
    } catch (dbErr) {
      if (dbErr.code === 11000) {
        logger.info(`Duplicate webhook event received and skipped: ${eventId}`);
        return res.status(200).json({ success: true, message: "Event already processed (duplicate ignored)." });
      }
      throw dbErr;
    }

    const payload = eventObj.payload;
    const io = req.app.get("io");

    // Process event
    if (eventType === "payment.captured" || eventType === "order.paid") {
      const paymentEntity = payload?.payment?.entity;
      const razorpayPaymentId = paymentEntity?.id;
      const razorpayOrderId = paymentEntity?.order_id || payload?.order?.entity?.id;

      const payment = await Payment.findOne({
        $or: [
          { razorpayPaymentId },
          { razorpayOrderId }
        ]
      });

      if (!payment) {
        logger.warn(`Payment record not found for webhook capture/order.paid`, { razorpayOrderId, razorpayPaymentId });
        await WebhookEvent.deleteOne({ eventId });
        return res.status(404).json({ success: false, message: "Payment record not found." });
      }

      if (payment.status !== "SUCCESS") {
        payment.status = "SUCCESS";
        payment.razorpayPaymentId = razorpayPaymentId || payment.razorpayPaymentId;
        payment.capturedAt = new Date();
        payment.webhookVerified = true;
        await payment.save();

        const booking = await Booking.findById(payment.bookingId);
        if (booking) {
          booking.paymentStatus = "PAID";
          booking.status = "Confirmed";
          await booking.save();

          // Write Audit Log
          await logAudit({
            req,
            userId: payment.userId,
            role: "customer",
            action: "PAYMENT_CAPTURED",
            details: {
              bookingId: booking._id,
              paymentId: payment._id,
              event: eventType,
              timestamp: new Date(),
            }
          });

          // ── EVENT 2 – PAYMENT SUCCESS ──
          sendNotification({
            userId: booking.guestSnapshot?.email || payment.userId,
            role: "customer",
            message: "Booking Confirmed",
            type: "booking"
          }).catch(() => {});

          sendNotification({
            role: "admin",
            message: "New Confirmed Booking",
            type: "booking"
          }).catch(() => {});

          sendNotification({
            hotelId: booking.hotelStringId || booking.hotelId?.toString() || null,
            role: "manager",
            message: "Booking Confirmed",
            type: "booking"
          }).catch(() => {});

          // Emit Socket events
          if (io) {
            io.emit("booking_update", { _id: booking._id, status: "Confirmed", roomId: booking.room });
            io.emit("payment_update", { _id: payment._id, status: "SUCCESS" });
          }

          // Send confirmation email
          sendBookingConfirmation({
            to:          booking.guestSnapshot?.email,
            guestName:   booking.guestSnapshot?.name,
            hotelName:   booking.hotelName || "Unknown Hotel",
            bookingRef:  booking.bookingRef,
            checkIn:     booking.checkIn,
            checkOut:    booking.checkOut,
            nights:      booking.nights,
            roomType:    booking.roomType,
            totalAmount: booking.totalAmount,
          }).catch((err) => logger.warn("Failed to send webhook confirmation email", { error: err.message }));
        }
      }
    } else if (eventType === "payment.failed") {
      const paymentEntity = payload?.payment?.entity;
      const razorpayPaymentId = paymentEntity?.id;
      const razorpayOrderId = paymentEntity?.order_id;
      const errorDescription = paymentEntity?.error_description || "Payment failed at gateway";

      const payment = await Payment.findOne({
        $or: [
          { razorpayPaymentId },
          { razorpayOrderId }
        ]
      });

      if (!payment) {
        logger.warn(`Payment record not found for webhook failure`, { razorpayOrderId, razorpayPaymentId });
        await WebhookEvent.deleteOne({ eventId });
        return res.status(404).json({ success: false, message: "Payment record not found." });
      }

      if (payment.status !== "FAILED") {
        payment.status = "FAILED";
        payment.razorpayPaymentId = razorpayPaymentId || payment.razorpayPaymentId;
        payment.failureReason = errorDescription;
        await payment.save();

        const booking = await Booking.findById(payment.bookingId);
        if (booking) {
          booking.paymentStatus = "FAILED";
          booking.status = "PAYMENT_FAILED";
          await booking.save();

          // Free up room
          const { syncRoomLegacyStatus } = await import("../services/roomAllocationService.js");
          await syncRoomLegacyStatus(booking.room).catch(() => {});

          // Write Audit Log
          await logAudit({
            req,
            userId: payment.userId,
            role: "customer",
            action: "PAYMENT_FAILED",
            details: {
              bookingId: booking._id,
              paymentId: payment._id,
              event: eventType,
              timestamp: new Date(),
              reason: errorDescription
            }
          });

          // ── EVENT 3 – PAYMENT FAILED ──
          sendNotification({
            userId: booking.guestSnapshot?.email || payment.userId,
            role: "customer",
            message: "Payment Failed",
            type: "booking"
          }).catch(() => {});

          sendNotification({
            role: "admin",
            message: "Payment Failed",
            type: "booking"
          }).catch(() => {});

          sendNotification({
            hotelId: booking.hotelStringId || booking.hotelId?.toString() || null,
            role: "manager",
            message: "Payment Failed",
            type: "booking"
          }).catch(() => {});

          if (io) {
            io.emit("booking_update", { _id: booking._id, status: "PAYMENT_FAILED" });
            io.emit("payment_update", { _id: payment._id, status: "FAILED" });
            io.emit("roomStatusUpdate", { roomId: booking.room, hotelStringId: booking.hotelStringId });
          }
        }
      }
    } else if (eventType === "refund.created" || eventType === "refund.processed") {
      const refundEntity = payload?.refund?.entity;
      const razorpayPaymentId = refundEntity?.payment_id;
      const refundId = refundEntity?.id;

      const payment = await Payment.findOne({ razorpayPaymentId });
      if (!payment) {
        logger.warn(`Payment record not found for webhook refund`, { razorpayPaymentId });
        await WebhookEvent.deleteOne({ eventId });
        return res.status(404).json({ success: false, message: "Payment record not found." });
      }

      if (payment.status !== "REFUNDED") {
        payment.status = "REFUNDED";
        await payment.save();

        const booking = await Booking.findById(payment.bookingId);
        if (booking) {
          booking.paymentStatus = "REFUNDED";
          booking.status = "Cancelled";
          await booking.save();

          // Free up room
          const { syncRoomLegacyStatus } = await import("../services/roomAllocationService.js");
          await syncRoomLegacyStatus(booking.room).catch(() => {});

          // Write Audit Log
          await logAudit({
            req,
            userId: payment.userId,
            role: "customer",
            action: eventType === "refund.created" ? "REFUND_CREATED" : "REFUND_PROCESSED",
            details: {
              bookingId: booking._id,
              paymentId: payment._id,
              event: eventType,
              timestamp: new Date(),
              refundId
            }
          });

          // Send notification
          sendNotification({
            userId: booking.guestSnapshot?.email || payment.userId,
            role: "customer",
            message: `Refund processed for booking ${booking.bookingRef}.`,
            type: "booking"
          }).catch(() => {});

          if (io) {
            io.emit("booking_update", { _id: booking._id, status: "Cancelled" });
            io.emit("payment_update", { _id: payment._id, status: "REFUNDED" });
            io.emit("roomStatusUpdate", { roomId: booking.room, hotelStringId: booking.hotelStringId });
          }
        }
      }
    } else if (eventType === "payment.authorized") {
      logger.info(`Webhook event payment.authorized received for payment ${payload?.payment?.entity?.id}. Waiting for capture.`);
    }

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
      logger.warn("Refund failed: Payment ID is required.");
      return res.status(400).json({ success: false, message: "Payment ID (Razorpay ID) is required." });
    }

    logger.info("Refund request received", { paymentId, amount, requestedBy: user.email || user.id });

    // Find the successful payment record
    const payment = await Payment.findOne({ razorpayPaymentId: paymentId });
    if (!payment) {
      logger.error("Refund failed: Payment record not found in database", { paymentId });
      return res.status(404).json({ success: false, message: "Payment record not found." });
    }

    if (payment.status !== "SUCCESS") {
      logger.warn("Refund failed: Payment is not in SUCCESS state", { paymentId, currentStatus: payment.status });
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
    const isMockPayment = paymentId.startsWith("pay_mock_") || !process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID === "rzp_test_dummy";

    if (isMockPayment) {
      logger.info("Generating mock Razorpay refund (Sandbox Mode)", { paymentId, amount: refundOptions.amount });
      refund = {
        id: `rfnd_mock_${crypto.randomBytes(8).toString("hex")}`,
      };
    } else {
      try {
        logger.info("Initiating Razorpay API refund call", { paymentId, amount: refundOptions.amount });
        refund = await callRazorpayWithTimeout(razorpay.payments.refund(paymentId, refundOptions), 8000);
        logger.info("Razorpay API refund succeeded", { paymentId, refundId: refund.id });
      } catch (rzpErr) {
        logger.error("Razorpay refund request failed at gateway", { error: rzpErr.message, paymentId });
        return res.status(502).json({ success: false, message: `Refund failed: ${rzpErr.message}` });
      }
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
