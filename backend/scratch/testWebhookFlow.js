import "dotenv/config";
import mongoose from "mongoose";
import crypto from "crypto";
import Booking from "../models/Booking.js";
import Payment from "../models/Payment.js";
import WebhookEvent from "../models/WebhookEvent.js";
import AuditLog from "../models/AuditLog.js";
import Room from "../models/Room.js";
import { processWebhook } from "../controllers/paymentController.js";

const SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || "dummy_webhook_secret";

// ── In-Memory Database Stubs ──────────────────────────────
let webhookEventsDb = new Set();
let paymentsDb = [];
let bookingsDb = [];

WebhookEvent.create = async (doc) => {
  if (webhookEventsDb.has(doc.eventId)) {
    const err = new Error("Duplicate key");
    err.code = 11000;
    throw err;
  }
  webhookEventsDb.add(doc.eventId);
  return doc;
};

WebhookEvent.deleteOne = async (query) => {
  webhookEventsDb.delete(query.eventId);
};

Payment.findOne = async (query) => {
  if (query.$or) {
    const q1 = query.$or[0]?.razorpayPaymentId;
    const q2 = query.$or[1]?.razorpayOrderId;
    const found = paymentsDb.find(p => p.razorpayPaymentId === q1 || p.razorpayOrderId === q2);
    return found ? makeMockPayment(found) : null;
  }
  const found = paymentsDb.find(p => p.razorpayPaymentId === query.razorpayPaymentId || p.razorpayOrderId === query.razorpayOrderId);
  return found ? makeMockPayment(found) : null;
};

Booking.findById = async (id) => {
  const found = bookingsDb.find(b => String(b._id) === String(id));
  return found ? makeMockBooking(found) : null;
};

AuditLog.create = async (doc) => {
  console.log(`[Mock AuditLog] Created event: ${doc.action || doc.event}`);
  return doc;
};

Room.findByIdAndUpdate = async (id, update) => {
  console.log(`[Mock Room] findByIdAndUpdate: ${id} updated status to Available`);
  return { _id: id };
};

Room.findOneAndUpdate = async (query, update) => {
  console.log(`[Mock Room] findOneAndUpdate query:`, query);
  return { _id: query._id || "mock-room-id" };
};

function makeMockPayment(data) {
  return {
    ...data,
    save: async function() {
      const idx = paymentsDb.findIndex(p => p._id === this._id);
      if (idx !== -1) paymentsDb[idx] = this;
      return this;
    }
  };
}

function makeMockBooking(data) {
  return {
    ...data,
    save: async function() {
      const idx = bookingsDb.findIndex(b => b._id === this._id);
      if (idx !== -1) bookingsDb[idx] = this;
      return this;
    }
  };
}

// ── Test Request Helpers ──────────────────────────────────
function generateSignature(bodyString, secret = SECRET) {
  return crypto.createHmac("sha256", secret).update(bodyString).digest("hex");
}

async function runTestWebhook(payload, signature) {
  const bodyString = JSON.stringify(payload);
  const req = {
    headers: {
      "x-razorpay-signature": signature || generateSignature(bodyString),
    },
    rawBody: bodyString,
    body: payload,
    app: {
      get: (key) => {
        if (key === "io") {
          return {
            emit: (event, data) => console.log(`[Mock SocketIO] Event "${event}" emitted:`, data)
          };
        }
        return null;
      }
    },
    ip: "127.0.0.1"
  };

  const res = {
    statusCode: 200,
    responseData: null,
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    json: function(data) {
      this.responseData = data;
      return this;
    }
  };

  await processWebhook(req, res, (err) => {
    if (err) console.error("Next middleware called with error:", err);
  });

  return res;
}

// ── Execution Suite ───────────────────────────────────────
async function runTests() {
  console.log("Starting Webhook Test Suite (In-Memory Mock Mode)...");

  // 1. Setup Initial Mock Data
  const bookingId1 = new mongoose.Types.ObjectId();
  const bookingId2 = new mongoose.Types.ObjectId();
  const bookingId3 = new mongoose.Types.ObjectId();

  bookingsDb = [
    {
      _id: bookingId1,
      room: "room_111",
      guestSnapshot: { name: "John Doe", email: "john@example.com" },
      status: "Pending",
      paymentStatus: "PENDING",
      totalAmount: 250,
      bookingRef: "LS-ABCDE",
      nights: 2,
      roomType: "Deluxe",
      checkIn: new Date(),
      checkOut: new Date(Date.now() + 172800000),
    },
    {
      _id: bookingId2,
      room: "room_222",
      guestSnapshot: { name: "Jane Smith", email: "jane@example.com" },
      status: "Pending",
      paymentStatus: "PENDING",
      totalAmount: 150,
      bookingRef: "LS-FGHIJ",
      nights: 1,
      roomType: "Standard",
      checkIn: new Date(),
      checkOut: new Date(Date.now() + 86400000),
    },
    {
      _id: bookingId3,
      room: "room_333",
      guestSnapshot: { name: "Bob Johnson", email: "bob@example.com" },
      status: "Confirmed",
      paymentStatus: "PAID",
      totalAmount: 500,
      bookingRef: "LS-KLMNO",
      nights: 3,
      roomType: "Suite",
      checkIn: new Date(),
      checkOut: new Date(Date.now() + 259200000),
    }
  ];

  paymentsDb = [
    {
      _id: "pay_rec_1",
      bookingId: bookingId1,
      userId: "john@example.com",
      razorpayOrderId: "order_111",
      razorpayPaymentId: null,
      status: "PENDING",
      amount: 250,
    },
    {
      _id: "pay_rec_2",
      bookingId: bookingId2,
      userId: "jane@example.com",
      razorpayOrderId: "order_222",
      razorpayPaymentId: null,
      status: "PENDING",
      amount: 150,
    },
    {
      _id: "pay_rec_3",
      bookingId: bookingId3,
      userId: "bob@example.com",
      razorpayOrderId: "order_333",
      razorpayPaymentId: "pay_333",
      status: "SUCCESS",
      amount: 500,
    }
  ];

  // --- Test 1: Signature Verification Mismatch ---
  console.log("\n--- TEST 1: Signature Mismatch ---");
  const payload1 = { id: "evt_1", event: "payment.captured" };
  const res1 = await runTestWebhook(payload1, "wrong_signature");
  console.log(`Status: ${res1.statusCode}, Data:`, res1.responseData);
  if (res1.statusCode === 401 && res1.responseData.message.includes("Signature mismatch")) {
    console.log("✅ TEST 1 PASSED");
  } else {
    console.error("❌ TEST 1 FAILED");
  }

  // --- Test 2: Valid payment.captured Flow ---
  console.log("\n--- TEST 2: Valid payment.captured ---");
  const payload2 = {
    id: "evt_2",
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: "pay_111",
          order_id: "order_111",
          amount: 25000,
        }
      }
    }
  };
  const res2 = await runTestWebhook(payload2);
  console.log(`Status: ${res2.statusCode}, Data:`, res2.responseData);
  
  const b1 = bookingsDb.find(b => String(b._id) === String(bookingId1));
  const p1 = paymentsDb.find(p => p._id === "pay_rec_1");
  console.log(`Booking Status: ${b1.status} (Expected: Confirmed)`);
  console.log(`Booking PaymentStatus: ${b1.paymentStatus} (Expected: PAID)`);
  console.log(`Payment Status: ${p1.status} (Expected: SUCCESS)`);
  console.log(`Payment webhookVerified: ${p1.webhookVerified} (Expected: true)`);
  console.log(`Payment capturedAt: ${p1.capturedAt}`);

  if (
    res2.statusCode === 200 &&
    b1.status === "Confirmed" &&
    b1.paymentStatus === "PAID" &&
    p1.status === "SUCCESS" &&
    p1.webhookVerified === true
  ) {
    console.log("✅ TEST 2 PASSED");
  } else {
    console.error("❌ TEST 2 FAILED");
  }

  // --- Test 3: Duplicate Webhook Event (Idempotency) ---
  console.log("\n--- TEST 3: Duplicate Webhook Event ---");
  const res3 = await runTestWebhook(payload2);
  console.log(`Status: ${res3.statusCode}, Data:`, res3.responseData);
  if (res3.statusCode === 200 && res3.responseData.message.includes("duplicate ignored")) {
    console.log("✅ TEST 3 PASSED");
  } else {
    console.error("❌ TEST 3 FAILED");
  }

  // --- Test 4: payment.failed Flow ---
  console.log("\n--- TEST 4: payment.failed ---");
  const payload4 = {
    id: "evt_4",
    event: "payment.failed",
    payload: {
      payment: {
        entity: {
          id: "pay_222",
          order_id: "order_222",
          error_description: "Card has insufficient limit",
        }
      }
    }
  };
  const res4 = await runTestWebhook(payload4);
  console.log(`Status: ${res4.statusCode}, Data:`, res4.responseData);

  const b2 = bookingsDb.find(b => String(b._id) === String(bookingId2));
  const p2 = paymentsDb.find(p => p._id === "pay_rec_2");
  console.log(`Booking Status: ${b2.status} (Expected: PAYMENT_FAILED)`);
  console.log(`Booking PaymentStatus: ${b2.paymentStatus} (Expected: FAILED)`);
  console.log(`Payment Status: ${p2.status} (Expected: FAILED)`);
  console.log(`Payment failureReason: ${p2.failureReason}`);

  if (
    res4.statusCode === 200 &&
    b2.status === "PAYMENT_FAILED" &&
    b2.paymentStatus === "FAILED" &&
    p2.status === "FAILED"
  ) {
    console.log("✅ TEST 4 PASSED");
  } else {
    console.error("❌ TEST 4 FAILED");
  }

  // --- Test 5: refund.processed Flow ---
  console.log("\n--- TEST 5: refund.processed ---");
  const payload5 = {
    id: "evt_5",
    event: "refund.processed",
    payload: {
      refund: {
        entity: {
          id: "rfnd_555",
          payment_id: "pay_333",
          amount: 50000,
        }
      }
    }
  };
  const res5 = await runTestWebhook(payload5);
  console.log(`Status: ${res5.statusCode}, Data:`, res5.responseData);

  const b3 = bookingsDb.find(b => String(b._id) === String(bookingId3));
  const p3 = paymentsDb.find(p => p._id === "pay_rec_3");
  console.log(`Booking Status: ${b3.status} (Expected: Cancelled)`);
  console.log(`Booking PaymentStatus: ${b3.paymentStatus} (Expected: REFUNDED)`);
  console.log(`Payment Status: ${p3.status} (Expected: REFUNDED)`);

  if (
    res5.statusCode === 200 &&
    b3.status === "Cancelled" &&
    b3.paymentStatus === "REFUNDED" &&
    p3.status === "REFUNDED"
  ) {
    console.log("✅ TEST 5 PASSED");
  } else {
    console.error("❌ TEST 5 FAILED");
  }

  console.log("\nAll integration test cases executed successfully!");
}

runTests().catch((err) => {
  console.error("Test execution aborted:", err);
});
