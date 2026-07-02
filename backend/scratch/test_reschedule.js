import "dotenv/config";
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

import mongoose from "mongoose";
import Booking from "../models/Booking.js";
import Room from "../models/Room.js";
import Hotel from "../models/Hotel.js";
import Guest from "../models/Guest.js";
import {
  rescheduleBooking,
  checkRescheduleAvailability,
  updateDeltaPaymentStatus
} from "../controllers/bookingController.js";

// Helper to create mock response object
function createMockResponse() {
  const res = {
    statusCode: 200,
    responseData: null
  };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (data) => {
    res.responseData = data;
    return res;
  };
  return res;
}

// Helper to mock request object
function createMockRequest({ params = {}, body = {}, query = {}, user = {} } = {}) {
  return {
    params,
    body,
    query,
    user,
    app: {
      get: (key) => {
        if (key === "io") {
          const emitter = {
            to: () => emitter,
            emit: () => {}
          };
          return emitter;
        }
        return null;
      }
    }
  };
}

async function run() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB.");

  // ── Setup Mock Documents ──
  console.log("Setting up mock database documents...");
  
  // Find or create test Hotel
  let hotel = await Hotel.findOne({ name: "Reschedule Test Hotel" });
  if (!hotel) {
    hotel = await Hotel.create({
      name: "Reschedule Test Hotel",
      hotelId: "reschedule-test-hotel",
      description: "A hotel for rescheduling tests",
      location: "Test Location",
      city: "Test City",
      pricePerNight: 1000,
      roomInventory: {
        Standard: { total: 2, price: 1000 }
      },
      isActive: true
    });
  } else {
    // Reset inventory capacity
    hotel.roomInventory = { Standard: { total: 2, price: 1000 } };
    await hotel.save();
  }

  // Find or create test Room
  let room = await Room.findOne({ roomNumber: "RESCH-101", hotelId: hotel._id });
  if (!room) {
    room = await Room.create({
      hotelId: hotel._id,
      hotelStringId: hotel.hotelId,
      roomNumber: "RESCH-101",
      roomTypeId: "Standard",
      type: "Standard",
      pricePerNight: 1000,
      capacity: 2,
      status: "Available",
      isActive: true
    });
  }

  // Find or create another physical Room (for capacity testing)
  let room2 = await Room.findOne({ roomNumber: "RESCH-102", hotelId: hotel._id });
  if (!room2) {
    room2 = await Room.create({
      hotelId: hotel._id,
      hotelStringId: hotel.hotelId,
      roomNumber: "RESCH-102",
      roomTypeId: "Standard",
      type: "Standard",
      pricePerNight: 1000,
      capacity: 2,
      status: "Available",
      isActive: true
    });
  }

  // Create Guest
  const guestEmail = "reschedule.guest@example.com";
  let guest = await Guest.findOne({ email: guestEmail });
  if (!guest) {
    guest = await Guest.create({
      name: "Reschedule Guest",
      email: guestEmail,
      phone: "1234567890",
      city: "Test City"
    });
  }

  // Create target Booking (Check-in 10 days from now, checkout 12 days from now)
  const tenDaysFromNow = new Date();
  tenDaysFromNow.setDate(tenDaysFromNow.getDate() + 10);
  tenDaysFromNow.setHours(12, 0, 0, 0);

  const twelveDaysFromNow = new Date();
  twelveDaysFromNow.setDate(twelveDaysFromNow.getDate() + 12);
  twelveDaysFromNow.setHours(11, 0, 0, 0);

  // Clean old bookings
  await Booking.deleteMany({ hotelId: hotel._id });

  const booking = await Booking.create({
    room: room._id,
    guest: guest._id,
    guestSnapshot: {
      name: guest.name,
      email: guest.email,
      phone: guest.phone,
      id: "AADHAAR123"
    },
    hotelId: hotel._id,
    hotelStringId: hotel.hotelId,
    hotelName: hotel.name,
    roomType: "Standard",
    checkIn: tenDaysFromNow,
    checkOut: twelveDaysFromNow,
    nights: 2,
    pricePerNight: 1000,
    subtotal: 2000,
    taxes: 360,
    discount: 0,
    totalAmount: 2360,
    status: "Confirmed",
    paymentStatus: "PAID",
    paymentMethod: "card"
  });

  console.log(`Created target Booking: ${booking._id} | Ref: ${booking.bookingRef}`);

  // -------------------------------------------------------------
  // Test 1: Pre-check availability for a free slot
  // -------------------------------------------------------------
  console.log("\n--- TEST 1: checkRescheduleAvailability for a free slot ---");
  const checkInRes = new Date();
  checkInRes.setDate(checkInRes.getDate() + 15); // 15 days from now
  const checkOutRes = new Date();
  checkOutRes.setDate(checkOutRes.getDate() + 18); // 18 days from now

  const req1 = createMockRequest({
    params: { id: booking._id.toString() },
    query: {
      checkIn: checkInRes.toISOString(),
      checkOut: checkOutRes.toISOString()
    },
    user: {
      guestId: guest._id.toString(),
      email: guest.email,
      role: "customer"
    }
  });
  const res1 = createMockResponse();

  await checkRescheduleAvailability(req1, res1, (err) => { if(err) throw err; });
  console.log(`Response status: ${res1.statusCode}`);
  console.log("Response data:", res1.responseData);
  if (res1.responseData?.success && res1.responseData?.available) {
    console.log("✅ TEST 1 PASSED");
  } else {
    console.log("❌ TEST 1 FAILED");
  }

  // -------------------------------------------------------------
  // Test 2: Successful Date Rescheduling
  // -------------------------------------------------------------
  console.log("\n--- TEST 2: Successful Date Rescheduling (Customer-initiated) ---");
  const req2 = createMockRequest({
    params: { id: booking._id.toString() },
    body: {
      newCheckIn: checkInRes.toISOString(),
      newCheckOut: checkOutRes.toISOString()
    },
    user: {
      guestId: guest._id.toString(),
      email: guest.email,
      role: "customer"
    }
  });
  const res2 = createMockResponse();

  await rescheduleBooking(req2, res2, (err) => { if(err) throw err; });
  console.log(`Response status: ${res2.statusCode}`);
  console.log("Response message:", res2.responseData?.message);
  
  // Verify Database Update
  const updatedBooking = await Booking.findById(booking._id);
  console.log(`Updated Nights: ${updatedBooking.nights} (Expected 3)`);
  console.log(`Updated Total Amount: ${updatedBooking.totalAmount} (Expected 1000 * 3 + tax)`);
  console.log(`Price Delta: ${updatedBooking.priceDelta} (Expected +1180)`);
  console.log(`Delta Payment Status: ${updatedBooking.deltaPaymentStatus} (Expected pending_collection)`);
  console.log(`Edit History length: ${updatedBooking.editHistory.length}`);
  console.log(`Edit History details:`, updatedBooking.editHistory[0]);

  if (
    res2.statusCode === 200 &&
    updatedBooking.nights === 3 &&
    updatedBooking.priceDelta > 0 &&
    updatedBooking.deltaPaymentStatus === "pending_collection" &&
    updatedBooking.editHistory.length === 1
  ) {
    console.log("✅ TEST 2 PASSED");
  } else {
    console.log("❌ TEST 2 FAILED");
  }

  // -------------------------------------------------------------
  // Test 3: Failure due to 3-hour cutoff rule
  // -------------------------------------------------------------
  console.log("\n--- TEST 3: Cutoff rule check (checkIn in 2 hours) ---");
  const closeCheckIn = new Date();
  closeCheckIn.setHours(closeCheckIn.getHours() + 2); // 2 hours from now

  updatedBooking.checkIn = closeCheckIn;
  await updatedBooking.save();

  const req3 = createMockRequest({
    params: { id: booking._id.toString() },
    body: {
      newCheckIn: checkInRes.toISOString(),
      newCheckOut: checkOutRes.toISOString()
    },
    user: {
      guestId: guest._id.toString(),
      email: guest.email,
      role: "customer"
    }
  });
  const res3 = createMockResponse();

  await rescheduleBooking(req3, res3, (err) => { if(err) throw err; });
  console.log(`Response status: ${res3.statusCode}`);
  console.log("Response data:", res3.responseData);
  if (res3.statusCode === 400 && res3.responseData?.code === "EDIT_WINDOW_CLOSED") {
    console.log("✅ TEST 3 PASSED");
  } else {
    console.log("❌ TEST 3 FAILED");
  }

  // Restore booking check-in date
  updatedBooking.checkIn = checkInRes;
  await updatedBooking.save();

  // -------------------------------------------------------------
  // Test 4: Failure due to overlapping conflicts
  // -------------------------------------------------------------
  console.log("\n--- TEST 4: Room Overlap Conflict check ---");
  // Set capacity of Standard room inventory to 1 (both standard rooms are booked)
  hotel.roomInventory = { Standard: { total: 1, price: 1000 } };
  await hotel.save();

  // Create an overlapping booking on the target reschedule dates for another guest
  const conflictCI = new Date();
  conflictCI.setDate(conflictCI.getDate() + 20);
  const conflictCO = new Date();
  conflictCO.setDate(conflictCO.getDate() + 23);

  const conflictBooking = await Booking.create({
    room: room2._id,
    guest: guest._id,
    guestSnapshot: {
      name: "Another Guest",
      email: "conflict@example.com",
      phone: "9999999999",
      id: "AADHAAR789"
    },
    hotelId: hotel._id,
    hotelStringId: hotel.hotelId,
    hotelName: hotel.name,
    roomType: "Standard",
    checkIn: conflictCI,
    checkOut: conflictCO,
    nights: 3,
    pricePerNight: 1000,
    subtotal: 3000,
    taxes: 540,
    discount: 0,
    totalAmount: 3540,
    status: "Confirmed",
    paymentStatus: "PAID",
    paymentMethod: "card"
  });

  console.log(`Created conflicting booking: ${conflictBooking._id} on dates ${conflictCI.toISOString().slice(0, 10)} to ${conflictCO.toISOString().slice(0, 10)}`);

  // Try to reschedule the target booking to conflict with conflictBooking dates
  const req4 = createMockRequest({
    params: { id: booking._id.toString() },
    body: {
      newCheckIn: conflictCI.toISOString(),
      newCheckOut: conflictCO.toISOString()
    },
    user: {
      guestId: guest._id.toString(),
      email: guest.email,
      role: "customer"
    }
  });
  const res4 = createMockResponse();

  await rescheduleBooking(req4, res4, (err) => { if(err) throw err; });
  console.log(`Response status: ${res4.statusCode}`);
  console.log("Response data:", res4.responseData);
  if (res4.statusCode === 409 && res4.responseData?.code === "NO_ROOMS_AVAILABLE") {
    console.log("✅ TEST 4 PASSED");
  } else {
    console.log("❌ TEST 4 FAILED");
  }

  // -------------------------------------------------------------
  // Test 5: Resolve Payment Delta (Admin-initiated)
  // -------------------------------------------------------------
  console.log("\n--- TEST 5: Resolve Payment Delta (Admin check) ---");
  const req5 = createMockRequest({
    params: { id: booking._id.toString() },
    body: {
      status: "resolved"
    },
    user: {
      id: "admin123",
      email: "admin@luxestay.com",
      role: "Super Admin"
    }
  });
  const res5 = createMockResponse();

  await updateDeltaPaymentStatus(req5, res5, (err) => { if(err) throw err; });
  console.log(`Response status: ${res5.statusCode}`);
  console.log("Response message:", res5.responseData?.message);
  
  const finalBooking = await Booking.findById(booking._id);
  console.log(`Final Delta Payment Status: ${finalBooking.deltaPaymentStatus}`);
  if (res5.statusCode === 200 && finalBooking.deltaPaymentStatus === "resolved") {
    console.log("✅ TEST 5 PASSED");
  } else {
    console.log("❌ TEST 5 FAILED");
  }

  // -------------------------------------------------------------
  // Test 6: Concurrent Rescheduling Race Condition
  // -------------------------------------------------------------
  console.log("\n--- TEST 6: Concurrent Rescheduling Race Condition ---");
  // Set inventory capacity to 1
  hotel.roomInventory = { Standard: { total: 1, price: 1000 } };
  await hotel.save();

  // Create two separate bookings for the same hotel and standard room type
  const dateA_CI = new Date();
  dateA_CI.setDate(dateA_CI.getDate() + 30);
  const dateA_CO = new Date();
  dateA_CO.setDate(dateA_CO.getDate() + 32);

  const dateB_CI = new Date();
  dateB_CI.setDate(dateB_CI.getDate() + 35);
  const dateB_CO = new Date();
  dateB_CO.setDate(dateB_CO.getDate() + 37);

  const bookingA = await Booking.create({
    room: room._id,
    guest: guest._id,
    guestSnapshot: { name: "Guest A", email: "guestA@example.com", phone: "111", id: "GUEST_A" },
    hotelId: hotel._id,
    hotelStringId: hotel.hotelId,
    hotelName: hotel.name,
    roomType: "Standard",
    checkIn: dateA_CI,
    checkOut: dateA_CO,
    nights: 2,
    pricePerNight: 1000,
    subtotal: 2000,
    taxes: 360,
    discount: 0,
    totalAmount: 2360,
    status: "Confirmed",
    paymentStatus: "PAID",
    paymentMethod: "card"
  });

  const bookingB = await Booking.create({
    room: room2._id,
    guest: guest._id,
    guestSnapshot: { name: "Guest B", email: "guestB@example.com", phone: "222", id: "GUEST_B" },
    hotelId: hotel._id,
    hotelStringId: hotel.hotelId,
    hotelName: hotel.name,
    roomType: "Standard",
    checkIn: dateB_CI,
    checkOut: dateB_CO,
    nights: 2,
    pricePerNight: 1000,
    subtotal: 2000,
    taxes: 360,
    discount: 0,
    totalAmount: 2360,
    status: "Confirmed",
    paymentStatus: "PAID",
    paymentMethod: "card"
  });

  // Target target reschedule dates: 40 to 42 days from now (only 1 capacity available)
  const targetCI = new Date();
  targetCI.setDate(targetCI.getDate() + 40);
  const targetCO = new Date();
  targetCO.setDate(targetCO.getDate() + 42);

  const reqA = createMockRequest({
    params: { id: bookingA._id.toString() },
    body: { newCheckIn: targetCI.toISOString(), newCheckOut: targetCO.toISOString() },
    user: { guestId: guest._id.toString(), email: "guestA@example.com", role: "customer" }
  });
  const resA = createMockResponse();

  const reqB = createMockRequest({
    params: { id: bookingB._id.toString() },
    body: { newCheckIn: targetCI.toISOString(), newCheckOut: targetCO.toISOString() },
    user: { guestId: guest._id.toString(), email: "guestB@example.com", role: "customer" }
  });
  const resB = createMockResponse();

  console.log("Firing concurrent reschedule requests for Booking A and Booking B...");
  await Promise.all([
    rescheduleBooking(reqA, resA, (err) => { if(err) throw err; }),
    rescheduleBooking(reqB, resB, (err) => { if(err) throw err; })
  ]);

  console.log(`Booking A response status: ${resA.statusCode}`);
  console.log(`Booking B response status: ${resB.statusCode}`);

  const successCount = [resA, resB].filter(r => r.statusCode === 200).length;
  const conflictCount = [resA, resB].filter(r => r.statusCode === 409 && r.responseData?.code === "NO_ROOMS_AVAILABLE").length;

  console.log(`Success Count: ${successCount} (Expected 1)`);
  console.log(`Conflict Count: ${conflictCount} (Expected 1)`);

  if (successCount === 1 && conflictCount === 1) {
    console.log("✅ TEST 6 PASSED");
  } else {
    console.log("❌ TEST 6 FAILED");
  }

  // ── Clean Up Database ──
  console.log("\nCleaning up test documents from database...");
  await Booking.deleteMany({ hotelId: hotel._id });
  await Room.deleteMany({ hotelId: hotel._id });
  await Hotel.deleteOne({ _id: hotel._id });
  await Guest.deleteOne({ _id: guest._id });

  await mongoose.connection.close();
  console.log("Database connection closed. Tests finished successfully!");
}

run().catch((err) => {
  console.error("Test suite crashed:", err);
  mongoose.connection.close();
});
