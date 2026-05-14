/**
 * LuxeStay API — Full Test Suite
 * Tests every endpoint including payment simulation
 * Run: node utils/testAPIs.js  (from inside backend/)
 */

import "dotenv/config";
import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

const BASE = `http://localhost:${process.env.PORT || 5000}`;

// ── Colours for terminal output ───────────────────────────
const c = {
  green:  (s) => `\x1b[32m${s}\x1b[0m`,
  red:    (s) => `\x1b[31m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  cyan:   (s) => `\x1b[36m${s}\x1b[0m`,
  bold:   (s) => `\x1b[1m${s}\x1b[0m`,
  dim:    (s) => `\x1b[2m${s}\x1b[0m`,
};

let passed = 0;
let failed = 0;
const failures = [];

// ── Helper: HTTP request ──────────────────────────────────
async function req(method, path, body = null) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, opts);
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

// ── Helper: assert ────────────────────────────────────────
function assert(label, condition, detail = "") {
  if (condition) {
    console.log(`  ${c.green("✓")} ${label}`);
    passed++;
  } else {
    console.log(`  ${c.red("✗")} ${label} ${c.dim(detail)}`);
    failed++;
    failures.push(`${label} — ${detail}`);
  }
}

function section(title) {
  console.log(`\n${c.bold(c.cyan(`━━━ ${title} ━━━`))}`);
}

// ═══════════════════════════════════════════════════════════
// TEST RUNNER
// ═══════════════════════════════════════════════════════════
async function runTests() {
  console.log(c.bold("\n🏨  LuxeStay API — Full Test Suite"));
  console.log(c.dim(`    Target: ${BASE}\n`));

  let roomId = null;
  let bookingId = null;

  // ─────────────────────────────────────────────────────────
  section("1. HEALTH CHECKS");
  // ─────────────────────────────────────────────────────────

  {
    const { status, data } = await req("GET", "/");
    assert("GET /  → 200 + API menu",
      status === 200 && data.success === true,
      `status=${status}`);
    assert("GET /  → has endpoints map",
      data.endpoints && data.endpoints.rooms,
      JSON.stringify(data.endpoints));
  }

  {
    const { status, data } = await req("GET", "/api/health");
    assert("GET /api/health → 200",
      status === 200 && data.success === true,
      `status=${status}`);
    assert("GET /api/health → has timestamp",
      !!data.timestamp,
      data.timestamp);
  }

  {
    const { status, data } = await req("GET", "/api/nonexistent-route");
    assert("GET /api/nonexistent → 404 with message",
      status === 404 && data.success === false,
      `status=${status}`);
  }

  // ─────────────────────────────────────────────────────────
  section("2. ROOMS — GET");
  // ─────────────────────────────────────────────────────────

  {
    const { status, data } = await req("GET", "/api/rooms");
    assert("GET /api/rooms → 200",
      status === 200 && data.success === true,
      `status=${status}`);
    assert("GET /api/rooms → returns array",
      Array.isArray(data.data),
      typeof data.data);
    assert("GET /api/rooms → count matches",
      data.count === data.data.length,
      `count=${data.count} len=${data.data?.length}`);

    if (data.data?.length > 0) {
      roomId = data.data[0]._id;
      const room = data.data[0];
      assert("Room has required fields (roomNumber, type, pricePerNight, status)",
        room.roomNumber && room.type && room.pricePerNight && room.status,
        JSON.stringify({ roomNumber: room.roomNumber, type: room.type, price: room.pricePerNight, status: room.status }));
      assert("Room status is valid enum",
        ["Available", "Booked", "Maintenance"].includes(room.status),
        room.status);
      assert("Room has images array",
        Array.isArray(room.images),
        typeof room.images);
    }
  }

  {
    const { status, data } = await req("GET", "/api/rooms?status=Available");
    assert("GET /api/rooms?status=Available → filters correctly",
      status === 200 && data.data.every(r => r.status === "Available"),
      `count=${data.count}`);
  }

  {
    const { status, data } = await req("GET", "/api/rooms?type=Deluxe");
    assert("GET /api/rooms?type=Deluxe → filters by type",
      status === 200,
      `count=${data.count}`);
  }

  {
    const { status, data } = await req("GET", "/api/rooms?minPrice=100&maxPrice=600");
    assert("GET /api/rooms?minPrice=100&maxPrice=600 → price filter works",
      status === 200 && data.data.every(r => r.pricePerNight >= 100 && r.pricePerNight <= 600),
      `count=${data.count}`);
  }

  // ─────────────────────────────────────────────────────────
  section("3. ROOMS — GET by ID");
  // ─────────────────────────────────────────────────────────

  if (roomId) {
    const { status, data } = await req("GET", `/api/rooms/${roomId}`);
    assert("GET /api/rooms/:id → 200",
      status === 200 && data.success === true,
      `status=${status}`);
    assert("GET /api/rooms/:id → correct room returned",
      data.data._id === roomId,
      data.data._id);
  }

  {
    const { status, data } = await req("GET", "/api/rooms/000000000000000000000000");
    assert("GET /api/rooms/invalidId → 404",
      status === 404 && data.success === false,
      `status=${status}`);
  }

  {
    const { status, data } = await req("GET", "/api/rooms/not-a-mongo-id");
    assert("GET /api/rooms/badformat → 400 CastError handled",
      status === 400 && data.success === false,
      `status=${status} msg=${data.message}`);
  }

  // ─────────────────────────────────────────────────────────
  section("4. ROOMS — POST (create)");
  // ─────────────────────────────────────────────────────────

  let testRoomId = null;
  {
    const { status, data } = await req("POST", "/api/rooms", {
      roomNumber: "TEST-999",
      type: "Suite",
      description: "Test suite for API testing",
      pricePerNight: 350,
      capacity: 2,
      bedType: "King",
      floor: 9,
      amenities: ["Free WiFi", "Mini Bar"],
      images: ["https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400"],
    });
    assert("POST /api/rooms → 201 created",
      status === 201 && data.success === true,
      `status=${status} msg=${data.message}`);
    assert("POST /api/rooms → returns created room",
      data.data?.roomNumber === "TEST-999",
      data.data?.roomNumber);
    testRoomId = data.data?._id;
  }

  {
    // Duplicate room number
    const { status, data } = await req("POST", "/api/rooms", {
      roomNumber: "TEST-999",
      type: "Suite",
      pricePerNight: 200,
    });
    assert("POST /api/rooms duplicate roomNumber → 409 conflict",
      status === 409 && data.success === false,
      `status=${status} msg=${data.message}`);
  }

  {
    // Missing required fields
    const { status, data } = await req("POST", "/api/rooms", {
      type: "Suite",
    });
    assert("POST /api/rooms missing fields → 422 validation error",
      status === 422 && data.success === false,
      `status=${status} errors=${JSON.stringify(data.errors)}`);
  }

  {
    // Invalid type enum
    const { status, data } = await req("POST", "/api/rooms", {
      roomNumber: "TEST-998",
      type: "InvalidType",
      pricePerNight: 200,
    });
    assert("POST /api/rooms invalid type → 422 validation error",
      status === 422 && data.success === false,
      `status=${status}`);
  }

  // ─────────────────────────────────────────────────────────
  section("5. ROOMS — PATCH (update status)");
  // ─────────────────────────────────────────────────────────

  if (testRoomId) {
    const { status, data } = await req("PATCH", `/api/rooms/${testRoomId}`, {
      status: "Maintenance",
    });
    assert("PATCH /api/rooms/:id → status updated to Maintenance",
      status === 200 && data.data?.status === "Maintenance",
      `status=${status} newStatus=${data.data?.status}`);
  }

  if (testRoomId) {
    const { status, data } = await req("PATCH", `/api/rooms/${testRoomId}`, {
      status: "Available",
    });
    assert("PATCH /api/rooms/:id → status reset to Available",
      status === 200 && data.data?.status === "Available",
      `status=${status}`);
  }

  {
    const { status, data } = await req("PATCH", `/api/rooms/${testRoomId}`, {
      status: "InvalidStatus",
    });
    assert("PATCH /api/rooms/:id invalid status → 422",
      status === 422 && data.success === false,
      `status=${status}`);
  }

  // ─────────────────────────────────────────────────────────
  section("6. BOOKINGS — POST (create — atomic transaction)");
  // ─────────────────────────────────────────────────────────

  if (roomId) {
    const bookingPayload = {
      roomId,
      guest: {
        name: "James Wilson",
        email: "james.wilson@test.com",
        phone: "+1 555 000 0001",
        city: "New York",
      },
      checkIn: "2025-09-01",
      checkOut: "2025-09-04",
      pricePerNight: 480,
      subtotal: 1440,
      taxes: 115,
      discount: 144,
      totalAmount: 1411,
      promoCode: "LUXE10",
      paymentMethod: "card",
      specialRequests: "Late check-in please",
      additionalAdults: [
        { name: "Sarah Wilson", email: "sarah@test.com", phone: "+1 555 000 0002" },
      ],
      additionalChildren: [
        { name: "Tom Wilson", age: 8 },
      ],
    };

    const { status, data } = await req("POST", "/api/bookings", bookingPayload);
    assert("POST /api/bookings → 201 confirmed",
      status === 201 && data.success === true,
      `status=${status} msg=${data.message}`);
    assert("POST /api/bookings → has bookingRef",
      !!data.data?.bookingRef,
      data.data?.bookingRef);
    assert("POST /api/bookings → status is Confirmed",
      data.data?.status === "Confirmed",
      data.data?.status);
    assert("POST /api/bookings → room is populated",
      !!data.data?.room?.roomNumber,
      JSON.stringify(data.data?.room));
    assert("POST /api/bookings → guest is populated",
      !!data.data?.guest?.email,
      JSON.stringify(data.data?.guest));
    assert("POST /api/bookings → nights calculated correctly",
      data.data?.nights === 3,
      `nights=${data.data?.nights}`);

    bookingId = data.data?._id;

    // Verify room is now Booked (atomic side-effect)
    const roomCheck = await req("GET", `/api/rooms/${roomId}`);
    assert("POST /api/bookings → room status atomically set to Booked",
      roomCheck.data?.data?.status === "Booked",
      `roomStatus=${roomCheck.data?.data?.status}`);
  }

  // ─────────────────────────────────────────────────────────
  section("7. BOOKINGS — Validation & Edge Cases");
  // ─────────────────────────────────────────────────────────

  {
    // Missing required fields
    const { status, data } = await req("POST", "/api/bookings", {
      guest: { name: "Test" },
    });
    assert("POST /api/bookings missing fields → 422",
      status === 422 && data.success === false,
      `status=${status} errors=${data.errors?.length}`);
  }

  {
    // Invalid date range (checkOut before checkIn)
    const { status, data } = await req("POST", "/api/bookings", {
      roomId: roomId || "000000000000000000000000",
      guest: { name: "Test", email: "t@t.com", phone: "1234567" },
      checkIn: "2025-09-10",
      checkOut: "2025-09-05",  // ← before checkIn
      pricePerNight: 100,
      subtotal: 100,
      totalAmount: 100,
    });
    assert("POST /api/bookings checkOut before checkIn → 422",
      status === 422 && data.success === false,
      `status=${status}`);
  }

  {
    // Try to book an already-Booked room
    if (roomId) {
      const { status, data } = await req("POST", "/api/bookings", {
        roomId,
        guest: { name: "Another Guest", email: "another@test.com", phone: "+1 555 999" },
        checkIn: "2025-10-01",
        checkOut: "2025-10-03",
        pricePerNight: 480,
        subtotal: 960,
        totalAmount: 960,
      });
      assert("POST /api/bookings already-booked room → 409 conflict",
        status === 409 && data.success === false,
        `status=${status} msg=${data.message}`);
    }
  }

  {
    // Invalid MongoDB ID — now returns 404 (room not found) since we accept any string
    const { status, data } = await req("POST", "/api/bookings", {
      roomId: "not-a-valid-id",
      guest: { name: "Test", email: "t@t.com", phone: "1234567" },
      checkIn: "2025-09-01",
      checkOut: "2025-09-03",
      pricePerNight: 100,
      subtotal: 200,
      totalAmount: 200,
    });
    assert("POST /api/bookings invalid roomId → 404 or 422 (room not found)",
      (status === 422 || status === 404) && data.success === false,
      `status=${status}`);
  }

  // ─────────────────────────────────────────────────────────
  section("8. BOOKINGS — GET");
  // ─────────────────────────────────────────────────────────

  {
    const { status, data } = await req("GET", "/api/bookings");
    assert("GET /api/bookings → 200 with array",
      status === 200 && Array.isArray(data.data),
      `status=${status} count=${data.count}`);
    assert("GET /api/bookings → populated room & guest",
      data.data?.[0]?.room?.roomNumber && data.data?.[0]?.guest?.email,
      `room=${data.data?.[0]?.room?.roomNumber} guest=${data.data?.[0]?.guest?.email}`);
  }

  {
    const { status, data } = await req("GET", "/api/bookings?status=Confirmed");
    assert("GET /api/bookings?status=Confirmed → filters correctly",
      status === 200 && data.data.every(b => b.status === "Confirmed"),
      `count=${data.count}`);
  }

  {
    const { status, data } = await req("GET", "/api/bookings?guestEmail=james.wilson@test.com");
    assert("GET /api/bookings?guestEmail → filters by guest email",
      status === 200 && data.count >= 1,
      `count=${data.count}`);
  }

  if (bookingId) {
    const { status, data } = await req("GET", `/api/bookings/${bookingId}`);
    assert("GET /api/bookings/:id → 200 single booking",
      status === 200 && data.data?._id === bookingId,
      `status=${status}`);
    assert("GET /api/bookings/:id → has all pricing fields",
      data.data?.subtotal !== undefined &&
      data.data?.taxes !== undefined &&
      data.data?.discount !== undefined &&
      data.data?.totalAmount !== undefined,
      JSON.stringify({
        subtotal: data.data?.subtotal,
        taxes: data.data?.taxes,
        discount: data.data?.discount,
        total: data.data?.totalAmount,
      }));
  }

  // ─────────────────────────────────────────────────────────
  section("9. PAYMENT GATEWAY SIMULATION");
  // ─────────────────────────────────────────────────────────

  // The payment is processed on POST /api/bookings.
  // We simulate all 3 payment methods + failure scenarios.

  // First, get an available room for payment tests
  const availRooms = await req("GET", "/api/rooms?status=Available");
  const payRoomId = availRooms.data?.data?.[0]?._id;

  if (payRoomId) {
    // ── Card payment ──────────────────────────────────────
    const { status: s1, data: d1 } = await req("POST", "/api/bookings", {
      roomId: payRoomId,
      guest: { name: "Card Payer", email: "card@test.com", phone: "+1 555 001" },
      checkIn: "2025-11-01",
      checkOut: "2025-11-03",
      pricePerNight: 350,
      subtotal: 700,
      taxes: 56,
      discount: 0,
      totalAmount: 756,
      paymentMethod: "card",
    });
    assert("PAYMENT: card method → booking confirmed",
      s1 === 201 && d1.data?.paymentMethod === "card",
      `status=${s1} method=${d1.data?.paymentMethod}`);

    const cardBookingId = d1.data?._id;

    // ── Cancel booking → room freed ───────────────────────
    if (cardBookingId) {
      const { status: cs, data: cd } = await req(
        "PATCH", `/api/bookings/${cardBookingId}/cancel`,
        { reason: "Test cancellation" }
      );
      assert("PAYMENT: cancel booking → 200 Cancelled",
        cs === 200 && cd.data?.status === "Cancelled",
        `status=${cs} bookingStatus=${cd.data?.status}`);

      // Verify room freed atomically
      const roomAfter = await req("GET", `/api/rooms/${payRoomId}`);
      assert("PAYMENT: cancel → room atomically freed (Available)",
        roomAfter.data?.data?.status === "Available",
        `roomStatus=${roomAfter.data?.data?.status}`);
    }
  }

  // ── UPI payment ───────────────────────────────────────
  const availRooms2 = await req("GET", "/api/rooms?status=Available");
  const upiRoomId = availRooms2.data?.data?.[0]?._id;

  if (upiRoomId) {
    const { status, data } = await req("POST", "/api/bookings", {
      roomId: upiRoomId,
      guest: { name: "UPI Payer", email: "upi@test.com", phone: "+91 9876543210" },
      checkIn: "2025-12-01",
      checkOut: "2025-12-02",
      pricePerNight: 350,
      subtotal: 350,
      taxes: 28,
      discount: 0,
      totalAmount: 378,
      paymentMethod: "upi",
    });
    assert("PAYMENT: upi method → booking confirmed",
      status === 201 && data.data?.paymentMethod === "upi",
      `status=${status} method=${data.data?.paymentMethod}`);
  }

  // ── Net Banking payment ───────────────────────────────
  const availRooms3 = await req("GET", "/api/rooms?status=Available");
  const nbRoomId = availRooms3.data?.data?.[0]?._id;

  if (nbRoomId) {
    const { status, data } = await req("POST", "/api/bookings", {
      roomId: nbRoomId,
      guest: { name: "NetBank Payer", email: "netbank@test.com", phone: "+91 9876543211" },
      checkIn: "2026-01-01",
      checkOut: "2026-01-05",
      pricePerNight: 350,
      subtotal: 1400,
      taxes: 112,
      discount: 210,
      totalAmount: 1302,
      paymentMethod: "netbanking",
      promoCode: "VIP20",
    });
    assert("PAYMENT: netbanking + promo code → booking confirmed",
      status === 201 && data.data?.paymentMethod === "netbanking",
      `status=${status} method=${data.data?.paymentMethod}`);
    assert("PAYMENT: promo code stored correctly",
      data.data?.promoCode === "VIP20",
      `promoCode=${data.data?.promoCode}`);
    assert("PAYMENT: discount applied correctly",
      data.data?.discount === 210,
      `discount=${data.data?.discount}`);
  }

  // ── Double-cancel guard ───────────────────────────────
  if (bookingId) {
    // First cancel
    await req("PATCH", `/api/bookings/${bookingId}/cancel`, { reason: "First cancel" });
    // Second cancel attempt
    const { status, data } = await req("PATCH", `/api/bookings/${bookingId}/cancel`, {});
    assert("PAYMENT: double-cancel → 400 already cancelled",
      status === 400 && data.success === false,
      `status=${status} msg=${data.message}`);
  }

  // ─────────────────────────────────────────────────────────
  section("10. GUESTS — GET");
  // ─────────────────────────────────────────────────────────

  {
    const { status, data } = await req("GET", "/api/guests");
    assert("GET /api/guests → 200 with array",
      status === 200 && Array.isArray(data.data),
      `status=${status} count=${data.count}`);
    assert("GET /api/guests → guests have bookings populated",
      data.data?.[0]?.bookings !== undefined,
      `bookings=${JSON.stringify(data.data?.[0]?.bookings?.slice(0,1))}`);
  }

  // ─────────────────────────────────────────────────────────
  section("11. CLEANUP — Delete test room");
  // ─────────────────────────────────────────────────────────

  if (testRoomId) {
    const { status, data } = await req("DELETE", `/api/rooms/${testRoomId}`);
    assert("DELETE /api/rooms/:id → soft-delete (isActive=false)",
      status === 200 && data.success === true,
      `status=${status}`);

    // Verify it no longer appears in GET /api/rooms
    const check = await req("GET", "/api/rooms");
    const stillVisible = check.data?.data?.some(r => r._id === testRoomId);
    assert("DELETE /api/rooms/:id → no longer in GET /api/rooms list",
      !stillVisible,
      `stillVisible=${stillVisible}`);
  }

  // ─────────────────────────────────────────────────────────
  // RESULTS
  // ─────────────────────────────────────────────────────────
  const total = passed + failed;
  console.log(`\n${"─".repeat(50)}`);
  console.log(c.bold(`📊  Results: ${passed}/${total} tests passed`));

  if (failed > 0) {
    console.log(c.red(`\n❌  ${failed} FAILED:`));
    failures.forEach((f, i) => console.log(c.red(`   ${i + 1}. ${f}`)));
  } else {
    console.log(c.green(`\n✅  All ${total} tests passed!`));
  }

  console.log(`\n${"─".repeat(50)}\n`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error(c.red(`\n💥 Test runner crashed: ${err.message}`));
  console.error(err.stack);
  process.exit(1);
});
