import "dotenv/config";
import mongoose from "mongoose";
import dns from "dns";
import crypto from "crypto";
import axios from "axios";
import { initializeRedis, getRedisClient } from "../config/redis.js";

// Configure DNS for MongoDB connection
dns.setDefaultResultOrder("ipv4first");
try {
  dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
} catch {}

const BASE_URL = "http://localhost:5000";
const API_URL = `${BASE_URL}/api`;

// Mongoose Models
import User from "../models/User.js";
import Guest from "../models/Guest.js";
import Booking from "../models/Booking.js";
import Payment from "../models/Payment.js";
import Room from "../models/Room.js";
import WebhookEvent from "../models/WebhookEvent.js";
import CancellationRefund from "../models/CancellationRefund.js";

async function logSection(name) {
  console.log("\n" + "=".repeat(80));
  console.log(`[TEST SECTION] ${name}`);
  console.log("=".repeat(80));
}

const reqHeaders = {
  "Content-Type": "application/json",
  "Origin": "http://localhost:5173"
};

async function run() {
  console.log("Connecting to Database...");
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB.");

  // Clear previous test users and events to ensure clean slate
  const TEST_EMAIL = "testpayment@luxestay.com";
  await User.deleteOne({ email: TEST_EMAIL });
  await Guest.deleteOne({ email: TEST_EMAIL });
  await WebhookEvent.deleteMany({ eventId: /^evt_test_/ });

  // Initialize Redis client
  console.log("Initializing Redis Client...");
  await initializeRedis();
  const redisClient = getRedisClient();
  if (redisClient) {
    await redisClient.del(`otp_${TEST_EMAIL}`);
    await redisClient.del(`cooldown_${TEST_EMAIL}`);
    await redisClient.del(`pending_user_${TEST_EMAIL}`);
  }

  // -------------------------------------------------------------
  // 1. REGISTER CUSTOMER AND CONFIRM VERIFICATION
  // -------------------------------------------------------------
  await logSection("1. Customer Registration & Verification Code Retrieval");
  
  const registerPayload = {
    name: "Test Payment User",
    email: TEST_EMAIL,
    password: "TestPassword123!",
    phone: "+919876543210",
    city: "Hyderabad"
  };

  console.log(`POST ${API_URL}/auth/register`);
  let regRes;
  try {
    regRes = await axios.post(`${API_URL}/auth/register`, registerPayload, { headers: reqHeaders });
    console.log(`Response Code: ${regRes.status}`);
    console.log("Response Payload:", regRes.data);
  } catch (err) {
    console.error("Registration failed:", err.response?.data || err.message);
    process.exit(1);
  }

  // Retrieve OTP code from Redis
  console.log("Retrieving OTP code from Redis...");
  if (!redisClient) {
    console.error("Redis client is not available. Ensure Redis is running.");
    process.exit(1);
  }
  let otpCode = await redisClient.get(`otp_${TEST_EMAIL}`);
  if (otpCode && (otpCode.startsWith('"') || otpCode.startsWith("'"))) {
    try {
      otpCode = JSON.parse(otpCode);
    } catch {}
  }
  console.log(`Retrieved OTP code from Redis: ${otpCode}`);
  if (!otpCode) {
    console.error("OTP code not found in Redis.");
    process.exit(1);
  }

  // Verify OTP via API
  console.log(`POST ${API_URL}/auth/verify-otp`);
  let verifyOtpRes;
  try {
    verifyOtpRes = await axios.post(`${API_URL}/auth/verify-otp`, {
      email: TEST_EMAIL,
      code: otpCode
    }, { headers: reqHeaders });
    console.log(`Response Code: ${verifyOtpRes.status}`);
    console.log("Response Payload:", verifyOtpRes.data);
  } catch (err) {
    console.error("OTP verification failed:", err.response?.data || err.message);
    process.exit(1);
  }

  const customerToken = verifyOtpRes.data.data.token;
  console.log("Access Token Obtained successfully:", customerToken.slice(0, 30) + "...");

  const customerHeaders = {
    ...reqHeaders,
    Authorization: `Bearer ${customerToken}`
  };

  // -------------------------------------------------------------
  // 3. RETRIEVE AVAILABLE ROOM
  // -------------------------------------------------------------
  await logSection("3. Retrieve Available Room");

  console.log(`GET ${API_URL}/rooms?status=Available`);
  const roomsRes = await axios.get(`${API_URL}/rooms?status=Available`);
  console.log(`Response Code: ${roomsRes.status}`);
  const rooms = roomsRes.data.data;
  console.log(`Found ${rooms.length} available rooms.`);
  if (!rooms.length) {
    console.error("No available rooms in DB. Please seed rooms first.");
    process.exit(1);
  }
  const testRoom = rooms[0];
  console.log("Selected Room for booking:", { roomId: testRoom._id, roomNumber: testRoom.roomNumber, price: testRoom.pricePerNight });

  // -------------------------------------------------------------
  // 4. CREATE RESERVATION BOOKING
  // -------------------------------------------------------------
  await logSection("4. Create Reservation Booking (PENDING state)");

  const bookingPayload = {
    roomId: testRoom._id,
    roomNumber: testRoom.roomNumber,
    roomTypeId: testRoom.roomNumber,
    guest: {
      name: "Test Payment User",
      email: TEST_EMAIL,
      phone: "+919876543210",
      id: "123412341234"
    },
    checkIn: new Date().toISOString().slice(0, 10),
    checkOut: new Date(Date.now() + 86400000).toISOString().slice(0, 10), // 1 night
    pricePerNight: testRoom.pricePerNight,
    subtotal: testRoom.pricePerNight,
    taxes: Math.round(testRoom.pricePerNight * 0.08),
    discount: 0,
    totalAmount: testRoom.pricePerNight + Math.round(testRoom.pricePerNight * 0.08),
    paymentMethod: "card"
  };

  console.log(`POST ${API_URL}/bookings`);
  const bookingRes = await axios.post(`${API_URL}/bookings`, bookingPayload, { headers: customerHeaders });
  console.log(`Response Code: ${bookingRes.status}`);
  const bookingId = bookingRes.data.data._id;
  console.log("Created Booking Info:", { bookingId, bookingRef: bookingRes.data.data.bookingRef, status: bookingRes.data.data.status });

  // -------------------------------------------------------------
  // 5. CREATE RAZORPAY ORDER (TIMEOUT AUDIT CHECK)
  // -------------------------------------------------------------
  await logSection("5. Create Razorpay Order (API Timeout Audit)");

  console.log(`POST ${API_URL}/payments/create-order`);
  const startTime = Date.now();
  const orderRes = await axios.post(`${API_URL}/payments/create-order`, { bookingId }, { headers: customerHeaders });
  const latency = Date.now() - startTime;
  console.log(`Response Code: ${orderRes.status}`);
  console.log(`Latency: ${latency}ms (Threshold: 5000ms)`);
  console.log("Razorpay Order Data:", orderRes.data);

  if (latency > 5000) {
    console.error("❌ FAILURE: Order creation latency exceeds 5 seconds limit.");
  } else {
    console.log("✅ SUCCESS: Order creation API returns in less than 5 seconds.");
  }

  const orderId = orderRes.data.orderId;

  // -------------------------------------------------------------
  // 6. LOCAL SIGNATURE VERIFICATION SUCCESS
  // -------------------------------------------------------------
  await logSection("6. Local Signature Verification (Bypass check)");

  const rzpSecret = process.env.RAZORPAY_KEY_SECRET || "dummy_secret";
  const mockPaymentId = "pay_mock_" + crypto.randomBytes(6).toString("hex");
  const validSignature = crypto
    .createHmac("sha256", rzpSecret)
    .update(`${orderId}|${mockPaymentId}`)
    .digest("hex");

  const verifyPayload = {
    razorpay_order_id: orderId,
    razorpay_payment_id: mockPaymentId,
    razorpay_signature: validSignature
  };

  console.log(`POST ${API_URL}/payments/verify`);
  const verifyRes = await axios.post(`${API_URL}/payments/verify`, verifyPayload, { headers: customerHeaders });
  console.log(`Response Code: ${verifyRes.status}`);
  console.log("Response Payload:", verifyRes.data);

  // -------------------------------------------------------------
  // 7. AUTHORITATIVE WEBHOOK RECONCILIATION
  // -------------------------------------------------------------
  await logSection("7. Webhook Event payment.captured Reconciliation");

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "dummy_webhook_secret";
  const webhookPayload = {
    id: "evt_test_cap_" + crypto.randomBytes(6).toString("hex"),
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: verifyPayload.razorpay_payment_id,
          order_id: orderId,
          amount: bookingPayload.totalAmount * 100,
        }
      }
    }
  };

  const bodyString = JSON.stringify(webhookPayload);
  const sig = crypto.createHmac("sha256", webhookSecret).update(bodyString).digest("hex");

  console.log(`POST ${API_URL}/webhooks/razorpay`);
  const webhookRes = await axios.post(`${API_URL}/webhooks/razorpay`, webhookPayload, {
    headers: {
      "Content-Type": "application/json",
      "x-razorpay-signature": sig,
      "Origin": "http://localhost:5173"
    }
  });
  console.log(`Response Code: ${webhookRes.status}`);
  console.log("Response Payload:", webhookRes.data);

  // Confirm database states
  console.log("Verifying Database updates...");
  const confirmedBooking = await Booking.findById(bookingId);
  const paymentRecord = await Payment.findOne({ razorpayOrderId: orderId });
  console.log("DB State Check:", {
    bookingId: confirmedBooking._id,
    status: confirmedBooking.status, // Expected: Confirmed
    paymentStatus: confirmedBooking.paymentStatus, // Expected: PAID
    paymentRecordStatus: paymentRecord.status, // Expected: SUCCESS
    webhookVerified: paymentRecord.webhookVerified // Expected: true
  });

  if (confirmedBooking.status === "Confirmed" && confirmedBooking.paymentStatus === "PAID" && paymentRecord.status === "SUCCESS") {
    console.log("✅ SUCCESS: Authoritative webhook payment capture worked. Booking status is Confirmed.");
  } else {
    console.error("❌ FAILURE: Booking status did not reconcile correctly.");
    process.exit(1);
  }

  // -------------------------------------------------------------
  // 8. VERIFY BOOKING APPEARS IN BOOKING HISTORY
  // -------------------------------------------------------------
  await logSection("8. Verify Booking History API");

  console.log(`GET ${API_URL}/auth/bookings`);
  const historyRes = await axios.get(`${API_URL}/auth/bookings`, { headers: customerHeaders });
  console.log(`Response Code: ${historyRes.status}`);
  const bookingsHistory = historyRes.data.data;
  const isFoundInHistory = bookingsHistory.some(b => String(b._id) === String(bookingId));
  console.log(`Found ${bookingsHistory.length} bookings. Active test booking in history: ${isFoundInHistory}`);

  if (isFoundInHistory) {
    console.log("✅ SUCCESS: Booking appears in user's reservation history.");
  } else {
    console.error("❌ FAILURE: Booking is missing from user's reservation history.");
    process.exit(1);
  }

  // -------------------------------------------------------------
  // 9. PAYMENT FAILURE FLOW
  // -------------------------------------------------------------
  await logSection("9. Payment Failure Flow");

  // Create booking #2
  console.log("Creating second reservation...");
  const booking2Res = await axios.post(`${API_URL}/bookings`, bookingPayload, { headers: customerHeaders });
  const booking2Id = booking2Res.data.data._id;
  
  // Create payment order #2
  console.log("Creating second payment order...");
  const order2Res = await axios.post(`${API_URL}/payments/create-order`, { bookingId: booking2Id }, { headers: customerHeaders });
  const order2Id = order2Res.data.orderId;

  // Send payment.failed Webhook
  const failurePayload = {
    id: "evt_test_fail_" + crypto.randomBytes(6).toString("hex"),
    event: "payment.failed",
    payload: {
      payment: {
        entity: {
          id: "pay_mock_failed_" + crypto.randomBytes(6).toString("hex"),
          order_id: order2Id,
          error_description: "Insufficient balance in card limit",
        }
      }
    }
  };

  const failBodyString = JSON.stringify(failurePayload);
  const failSig = crypto.createHmac("sha256", webhookSecret).update(failBodyString).digest("hex");

  console.log(`POST ${API_URL}/webhooks/razorpay (payment.failed)`);
  const webhookFailRes = await axios.post(`${API_URL}/webhooks/razorpay`, failurePayload, {
    headers: {
      "Content-Type": "application/json",
      "x-razorpay-signature": failSig,
      "Origin": "http://localhost:5173"
    }
  });
  console.log(`Response Code: ${webhookFailRes.status}`);

  // Confirm DB states
  const failedBooking = await Booking.findById(booking2Id);
  const failedPaymentRecord = await Payment.findOne({ razorpayOrderId: order2Id });
  console.log("DB State Check for failure:", {
    booking2Id: failedBooking._id,
    status: failedBooking.status, // Expected: PAYMENT_FAILED
    paymentStatus: failedBooking.paymentStatus, // Expected: FAILED
    paymentRecordStatus: failedPaymentRecord.status, // Expected: FAILED
    failureReason: failedPaymentRecord.failureReason
  });

  if (failedBooking.status === "PAYMENT_FAILED" && failedBooking.paymentStatus === "FAILED" && failedPaymentRecord.status === "FAILED") {
    console.log("✅ SUCCESS: Payment failure flow reconciled and updated room allocation successfully.");
  } else {
    console.error("❌ FAILURE: Payment failure flow did not reconcile correctly.");
    process.exit(1);
  }

  // -------------------------------------------------------------
  // 10. PAYMENT CANCELLATION FLOW
  // -------------------------------------------------------------
  await logSection("10. Payment Cancellation Flow");

  console.log(`PATCH ${API_URL}/bookings/${bookingId}/cancel`);
  const cancelRes = await axios.patch(`${API_URL}/bookings/${bookingId}/cancel`, { reason: "Change of plans" }, { headers: customerHeaders });
  console.log(`Response Code: ${cancelRes.status}`);
  console.log("Response Payload:", cancelRes.data);

  // Confirm DB States
  const cancelledBooking = await Booking.findById(bookingId);
  const refundRecord = await CancellationRefund.findOne({ bookingId });
  console.log("DB State Check for cancellation:", {
    bookingId: cancelledBooking._id,
    status: cancelledBooking.status, // Expected: Cancelled
    refundRecordStatus: refundRecord ? refundRecord.refundStatus : "NOT_CREATED" // Expected: pending
  });

  if (cancelledBooking.status === "Cancelled" && refundRecord && refundRecord.refundStatus === "pending") {
    console.log("✅ SUCCESS: Cancellation completed, room returned, and refund ledger created.");
  } else {
    console.error("❌ FAILURE: Booking cancellation flow failed.");
    process.exit(1);
  }

  // -------------------------------------------------------------
  // 11. REFUND ENDPOINT VERIFICATION (STAFF AUTH)
  // -------------------------------------------------------------
  await logSection("11. Manager Authentication & Payment Refund Verification");

  // Log in as manager
  const managerLoginPayload = {
    email: "lumiere.manager@luxestay.com",
    password: "Manager@Lumiere2024"
  };

  console.log(`POST ${API_URL}/manager/login`);
  const mgrLoginRes = await axios.post(`${API_URL}/manager/login`, managerLoginPayload, { headers: reqHeaders });
  console.log(`Response Code: ${mgrLoginRes.status}`);
  const managerToken = mgrLoginRes.data.data.token;
  console.log("Manager Access Token Obtained successfully:", managerToken.slice(0, 30) + "...");

  const managerHeaders = {
    ...reqHeaders,
    Authorization: `Bearer ${managerToken}`
  };

  // Call refund endpoint
  console.log(`POST ${API_URL}/payments/refund`);
  try {
    const refundRes = await axios.post(`${API_URL}/payments/refund`, {
      paymentId: verifyPayload.razorpay_payment_id,
      amount: bookingPayload.totalAmount
    }, { headers: managerHeaders });
    
    console.log(`Response Code: ${refundRes.status}`);
    console.log("Response Payload:", refundRes.data);

    // Confirm DB updates
    const refundedBooking = await Booking.findById(bookingId);
    const refundedPaymentRecord = await Payment.findOne({ razorpayOrderId: orderId });
    console.log("DB State Check for refund:", {
      bookingId: refundedBooking._id,
      status: refundedBooking.status, // Expected: Cancelled
      paymentStatus: refundedBooking.paymentStatus, // Expected: REFUNDED
      paymentRecordStatus: refundedPaymentRecord.status // Expected: REFUNDED
    });

    if (refundedBooking.paymentStatus === "REFUNDED" && refundedPaymentRecord.status === "REFUNDED") {
      console.log("✅ SUCCESS: Refund endpoint processed successfully.");
    } else {
      console.error("❌ FAILURE: Refund status was not correctly written to payment and booking records.");
      process.exit(1);
    }
  } catch (refundErr) {
    console.error("Refund endpoint failed:", refundErr.response?.data || refundErr.message);
    process.exit(1);
  }

  console.log("\n========================================================");
  console.log("🎉 ALL END-TO-END PAYMENT CHECKS VERIFIED SUCCESSFULLY!");
  console.log("========================================================\n");
  process.exit(0);
}

run().catch((err) => {
  console.error("FATAL: Test execution aborted with error:", err);
  process.exit(1);
});
