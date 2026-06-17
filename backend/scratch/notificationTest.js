import "dotenv/config";
import mongoose from "mongoose";
import dns from "dns";
import Booking from "../models/Booking.js";
import Notification from "../models/Notification.js";
import Payment from "../models/Payment.js";
import Room from "../models/Room.js";
import Guest from "../models/Guest.js";
import Hotel from "../models/Hotel.js";
import { sendNotification } from "../utils/notificationService.js";

// Configure DNS for MongoDB connection
dns.setDefaultResultOrder("ipv4first");
try {
  dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
} catch {}

const TEST_EMAIL = "notify_test@athithigriha.com";
const TEST_REF = "LS-99999";
const TEST_HOTEL_ID = "hotel_notif_test";

async function run() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected successfully.");

  // Clean previous test data
  console.log("Cleaning up previous test data...");
  await Notification.deleteMany({
    $or: [
      { userId: TEST_EMAIL },
      { message: new RegExp(TEST_REF) },
      { hotelId: TEST_HOTEL_ID }
    ]
  });
  await Booking.deleteOne({ bookingRef: TEST_REF });
  await Payment.deleteOne({ razorpayOrderId: "order_test_99999" });

  // Get or create mock room/hotel
  let room = await Room.findOne();
  if (!room) {
    room = await Room.create({
      roomNumber: "999",
      type: "Deluxe",
      pricePerNight: 5000,
      status: "Available",
      hotelStringId: TEST_HOTEL_ID,
    });
  }

  // Get or create mock guest
  let guest = await Guest.findOne({ email: TEST_EMAIL });
  if (!guest) {
    guest = await Guest.create({
      name: "Notification Test Guest",
      email: TEST_EMAIL,
      phone: "1234567890",
    });
  }

  console.log("\n==================================================");
  console.log("1. TESTING EVENT 1 - BOOKING CREATED");
  console.log("==================================================");

  // Simulate Booking Created
  const booking = await Booking.create({
    room: room._id,
    guest: guest._id,
    guestSnapshot: {
      name: guest.name,
      email: guest.email,
      id: guest._id.toString(),
    },
    checkIn: new Date(),
    checkOut: new Date(Date.now() + 86400000),
    pricePerNight: 5000,
    subtotal: 5000,
    totalAmount: 5900,
    status: "Pending",
    bookingRef: TEST_REF,
    hotelStringId: TEST_HOTEL_ID,
    hotelName: "AthithiGriha Test Hotel",
  });

  // Call the notifications logic for Booking Created
  // (We extract this directly from bookingController.js to verify it writes properly)
  await sendNotification({
    userId: booking.guestSnapshot.email,
    role: "customer",
    message: "Your booking is created and awaiting payment confirmation.",
    type: "booking",
  });

  await sendNotification({
    role: "admin",
    message: `New booking created: ${booking.bookingRef}`,
    type: "booking",
  });

  await sendNotification({
    hotelId: booking.hotelStringId,
    role: "manager",
    message: `New booking created: ${booking.bookingRef}`,
    type: "booking",
  });

  // Query and check
  let userNotifs = await Notification.find({ userId: TEST_EMAIL, role: "customer" });
  let adminNotifs = await Notification.find({ role: "admin", message: new RegExp(booking.bookingRef) });
  let managerNotifs = await Notification.find({ hotelId: TEST_HOTEL_ID, role: "manager" });

  console.log("User Event 1 Notif:", userNotifs.map(n => n.message));
  console.log("Admin Event 1 Notif:", adminNotifs.map(n => n.message));
  console.log("Manager Event 1 Notif:", managerNotifs.map(n => n.message));

  if (userNotifs.length > 0 && adminNotifs.length > 0 && managerNotifs.length > 0) {
    console.log("✅ Event 1 notifications generated for User, Admin, and Manager.");
  } else {
    throw new Error("Event 1 notifications verification failed!");
  }

  // Clear for next event to avoid count confusion
  await Notification.deleteMany({});

  console.log("\n==================================================");
  console.log("2. TESTING EVENT 2 - PAYMENT SUCCESS");
  console.log("==================================================");

  // Call the notifications logic for Payment Success
  await sendNotification({
    userId: booking.guestSnapshot.email,
    role: "customer",
    message: "Booking Confirmed",
    type: "booking"
  });

  await sendNotification({
    role: "admin",
    message: "New Confirmed Booking",
    type: "booking"
  });

  await sendNotification({
    hotelId: booking.hotelStringId,
    role: "manager",
    message: "Booking Confirmed",
    type: "booking"
  });

  userNotifs = await Notification.find({ userId: TEST_EMAIL, role: "customer" });
  adminNotifs = await Notification.find({ role: "admin", message: "New Confirmed Booking" });
  managerNotifs = await Notification.find({ hotelId: TEST_HOTEL_ID, role: "manager", message: "Booking Confirmed" });

  console.log("User Event 2 Notif:", userNotifs.map(n => n.message));
  console.log("Admin Event 2 Notif:", adminNotifs.map(n => n.message));
  console.log("Manager Event 2 Notif:", managerNotifs.map(n => n.message));

  if (userNotifs.length > 0 && adminNotifs.length > 0 && managerNotifs.length > 0) {
    console.log("✅ Event 2 notifications generated for User, Admin, and Manager.");
  } else {
    throw new Error("Event 2 notifications verification failed!");
  }

  await Notification.deleteMany({});

  console.log("\n==================================================");
  console.log("3. TESTING EVENT 3 - PAYMENT FAILED");
  console.log("==================================================");

  // Call the notifications logic for Payment Failed
  await sendNotification({
    userId: booking.guestSnapshot.email,
    role: "customer",
    message: "Payment Failed",
    type: "booking"
  });

  await sendNotification({
    role: "admin",
    message: "Payment Failed",
    type: "booking"
  });

  await sendNotification({
    hotelId: booking.hotelStringId,
    role: "manager",
    message: "Payment Failed",
    type: "booking"
  });

  userNotifs = await Notification.find({ userId: TEST_EMAIL, role: "customer" });
  adminNotifs = await Notification.find({ role: "admin", message: "Payment Failed" });
  managerNotifs = await Notification.find({ hotelId: TEST_HOTEL_ID, role: "manager", message: "Payment Failed" });

  console.log("User Event 3 Notif:", userNotifs.map(n => n.message));
  console.log("Admin Event 3 Notif:", adminNotifs.map(n => n.message));
  console.log("Manager Event 3 Notif:", managerNotifs.map(n => n.message));

  if (userNotifs.length > 0 && adminNotifs.length > 0 && managerNotifs.length > 0) {
    console.log("✅ Event 3 notifications generated for User, Admin, and Manager.");
  } else {
    throw new Error("Event 3 notifications verification failed!");
  }

  await Notification.deleteMany({});

  console.log("\n==================================================");
  console.log("4. TESTING EVENT 4 - PAYMENT CANCELLED");
  console.log("==================================================");

  // Call the notifications logic for Payment Cancelled
  await sendNotification({
    userId: booking.guestSnapshot.email,
    role: "customer",
    message: `Your payment for booking ${booking.bookingRef} was cancelled. You may retry payment anytime.`,
    type: "booking"
  });

  await sendNotification({
    role: "admin",
    message: `User cancelled payment for booking ${booking.bookingRef}.`,
    type: "booking"
  });

  await sendNotification({
    hotelId: booking.hotelStringId,
    role: "manager",
    message: `Booking ${booking.bookingRef} moved to PAYMENT_CANCELLED.`,
    type: "booking"
  });

  userNotifs = await Notification.find({ userId: TEST_EMAIL, role: "customer" });
  adminNotifs = await Notification.find({ role: "admin", message: new RegExp(booking.bookingRef) });
  managerNotifs = await Notification.find({ hotelId: TEST_HOTEL_ID, role: "manager", message: new RegExp(booking.bookingRef) });

  console.log("User Event 4 Notif:", userNotifs.map(n => n.message));
  console.log("Admin Event 4 Notif:", adminNotifs.map(n => n.message));
  console.log("Manager Event 4 Notif:", managerNotifs.map(n => n.message));

  if (userNotifs.length > 0 && adminNotifs.length > 0 && managerNotifs.length > 0) {
    console.log("✅ Event 4 notifications generated for User, Admin, and Manager.");
  } else {
    throw new Error("Event 4 notifications verification failed!");
  }

  // Clean up
  await Booking.deleteOne({ bookingRef: TEST_REF });
  console.log("\nTest suite completed successfully! All notification events verified.");
  await mongoose.disconnect();
}

run().catch(err => {
  console.error("Test failed with error:", err);
  mongoose.disconnect();
  process.exit(1);
});
