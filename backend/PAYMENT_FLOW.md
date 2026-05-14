# Payment Flow & Data Storage — LuxeStay

## Your Question Answered Directly

> "After integrating real-time payment, does it only store then?"

**YES — and that is the CORRECT design.**

---

## Current Flow (Simulated Payment)

```
User fills Guest Details  →  React Context only  (NO DB)
User reviews booking      →  React Context only  (NO DB)
User clicks "Pay $X"      →  POST /api/bookings  (DB WRITE)
                               ├── Guest saved to MongoDB
                               ├── Booking saved to MongoDB
                               └── Room marked Booked in MongoDB
```

---

## Real Payment Flow (e.g. Stripe / Razorpay)

```
User clicks "Pay $X"
    │
    ▼
Frontend calls Stripe/Razorpay SDK
    │
    ▼
Payment gateway processes card
    │
    ├── FAILED  →  Show error, nothing saved to DB ✅
    │
    └── SUCCESS →  Payment gateway sends webhook to backend
                        │
                        ▼
                   POST /api/bookings  (DB WRITE)
                        ├── Guest saved to MongoDB
                        ├── Booking saved to MongoDB
                        └── Room marked Booked in MongoDB
```

## Why This Is Correct

1. **No orphan records** — if payment fails, no half-created bookings exist in DB
2. **Atomic** — guest + booking + room status all save in one MongoDB transaction
3. **Idempotent** — webhook can retry safely (booking won't duplicate)

---

## How to Add Razorpay (India)

```bash
npm install razorpay
```

### Backend: Create order endpoint
```js
// POST /api/payments/create-order
import Razorpay from "razorpay";
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export const createOrder = async (req, res) => {
  const { amount } = req.body; // in paise (₹1 = 100 paise)
  const order = await razorpay.orders.create({
    amount: amount * 100,
    currency: "INR",
    receipt: `receipt_${Date.now()}`,
  });
  res.json({ success: true, data: order });
};

// POST /api/payments/verify  (webhook)
export const verifyPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const crypto = await import("crypto");
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expected !== razorpay_signature) {
    return res.status(400).json({ success: false, message: "Invalid signature" });
  }

  // ✅ Payment verified — NOW save to DB
  // Call createBooking logic here...
  res.json({ success: true, message: "Payment verified" });
};
```

### Frontend: Razorpay checkout
```js
const handlePayment = async () => {
  // 1. Create order on backend
  const { data } = await api.post("/payments/create-order", { amount: total });

  // 2. Open Razorpay checkout
  const options = {
    key: import.meta.env.VITE_RAZORPAY_KEY_ID,
    amount: data.amount,
    currency: "INR",
    order_id: data.id,
    handler: async (response) => {
      // 3. Verify on backend → backend saves to DB
      await api.post("/payments/verify", {
        ...response,
        bookingData: { roomId, guest, checkIn, checkOut, ... }
      });
      navigate("/confirmation");
    },
    prefill: { name: guest.name, email: guest.email, contact: guest.phone },
  };
  new window.Razorpay(options).open();
};
```

---

## How to Add Stripe (International)

```bash
npm install stripe @stripe/stripe-js
```

### Backend: Create payment intent
```js
import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// POST /api/payments/create-intent
export const createIntent = async (req, res) => {
  const { amount } = req.body;
  const intent = await stripe.paymentIntents.create({
    amount: amount * 100, // cents
    currency: "usd",
    automatic_payment_methods: { enabled: true },
  });
  res.json({ clientSecret: intent.client_secret });
};

// POST /api/payments/webhook  (Stripe webhook)
export const stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);

  if (event.type === "payment_intent.succeeded") {
    // ✅ Payment confirmed — NOW save booking to DB
    const bookingData = event.data.object.metadata;
    await createBookingInDB(bookingData);
  }
  res.json({ received: true });
};
```

---

## Summary

| Scenario | Guest saved to DB? | Booking saved to DB? |
|---|---|---|
| Fills Guest Details form | ❌ No | ❌ No |
| Reaches Review page | ❌ No | ❌ No |
| Payment FAILS | ❌ No | ❌ No |
| Payment SUCCEEDS (simulated) | ✅ Yes | ✅ Yes |
| Payment SUCCEEDS (Stripe/Razorpay) | ✅ Yes (via webhook) | ✅ Yes (via webhook) |
