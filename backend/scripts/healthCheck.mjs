/**
 * healthCheck.mjs — Live endpoint + WebSocket health report
 * Run: node backend/scripts/healthCheck.mjs
 */

const BASE = "http://localhost:5000";
const API  = `${BASE}/api`;

let pass = 0, fail = 0, warn = 0;

async function req(method, url, body) {
  try {
    const opts = {
      method,
      headers: {
        "Content-Type": "application/json",
        // Simulate a browser origin so CORS passes in production mode
        "Origin": "http://localhost:5173",
      },
      signal: AbortSignal.timeout(5000),
    };
    if (body) opts.body = JSON.stringify(body);
    const r   = await fetch(url, opts);
    const txt = await r.text();
    let json;
    try { json = JSON.parse(txt); } catch { json = { message: txt.slice(0, 80) }; }
    return { status: r.status, ok: r.ok, json };
  } catch (e) {
    return { status: 0, ok: false, json: { message: e.message } };
  }
}

function row(icon, label, status, note) {
  const s = status === 0 ? "ERR" : String(status);
  console.log(`  ${icon}  [${s.padStart(3)}]  ${label.padEnd(52)} ${note}`);
}

function ok(label, status, note)   { pass++; row("✅", label, status, note); }
function bad(label, status, note)  { fail++; row("❌", label, status, note); }
function caution(label, status, note) { warn++; row("⚠️ ", label, status, note); }

function check(label, r, expectedStatus, expectSuccess = true) {
  const gotStatus  = r.status === expectedStatus;
  const gotSuccess = r.json?.success === expectSuccess;
  const note = r.json?.message?.slice(0, 60) || "";
  if (gotStatus && gotSuccess) ok(label, r.status, note);
  else if (gotStatus)          caution(label, r.status, `success=${r.json?.success} — ${note}`);
  else                         bad(label, r.status, `expected ${expectedStatus}, got ${r.status} — ${note}`);
}

console.log("\n" + "═".repeat(75));
console.log("  LUXESTAY API HEALTH CHECK");
console.log("═".repeat(75));

// ── HEALTH ────────────────────────────────────────────────
console.log("\n  ── HEALTH ──────────────────────────────────────────────────────────");
check("GET  /",              await req("GET",  `${BASE}`),           200, true);
check("GET  /api/health",    await req("GET",  `${API}/health`),     200, true);

// ── CUSTOMER AUTH ─────────────────────────────────────────
console.log("\n  ── CUSTOMER AUTH (/api/auth) ───────────────────────────────────────");
check("POST /api/auth/register  (missing fields → 400)",  await req("POST", `${API}/auth/register`, {}),                                    400, false);
check("POST /api/auth/login     (bad creds → 401)",       await req("POST", `${API}/auth/login`,    { email:"x@x.com", password:"wrong" }), 401, false);
check("GET  /api/auth/me        (no token → 401)",        await req("GET",  `${API}/auth/me`),                                              401, false);

// ── ADMIN AUTH ────────────────────────────────────────────
console.log("\n  ── ADMIN AUTH (/api/admin) ─────────────────────────────────────────");
check("POST /api/admin/login    (bad creds → 401)",       await req("POST", `${API}/admin/login`,    { email:"bad@bad.com", password:"bad" }), 401, false);
check("GET  /api/admin/stats    (no token → 401)",        await req("GET",  `${API}/admin/stats`),                                            401, false);
check("GET  /api/admin/managers (no token → 401)",        await req("GET",  `${API}/admin/managers`),                                         401, false);
check("GET  /api/admin/analytics(no token → 401)",        await req("GET",  `${API}/admin/analytics`),                                        401, false);

// ── MANAGER AUTH ──────────────────────────────────────────
console.log("\n  ── MANAGER AUTH (/api/manager) ─────────────────────────────────────");
check("POST /api/manager/login    (bad creds → 401)",     await req("POST", `${API}/manager/login`,     { email:"bad@bad.com", password:"bad" }), 401, false);
check("GET  /api/manager/dashboard(no token → 401)",      await req("GET",  `${API}/manager/dashboard`),                                          401, false);
check("GET  /api/manager/rooms    (no token → 401)",      await req("GET",  `${API}/manager/rooms`),                                              401, false);
check("GET  /api/manager/bookings (no token → 401)",      await req("GET",  `${API}/manager/bookings`),                                           401, false);

// ── PUBLIC ENDPOINTS ──────────────────────────────────────
console.log("\n  ── PUBLIC ENDPOINTS ────────────────────────────────────────────────");
const hotels   = await req("GET", `${API}/hotels`);
const rooms    = await req("GET", `${API}/rooms`);
const bookings = await req("GET", `${API}/bookings`);
const guests   = await req("GET", `${API}/guests`);
check("GET  /api/hotels   (200 + data)",   hotels,   200, true);
check("GET  /api/rooms    (200 + data)",   rooms,    200, true);
check("GET  /api/bookings (200 + data)",   bookings, 200, true);
check("GET  /api/guests   (200 + data)",   guests,   200, true);

// Data counts
if (hotels.ok)   console.log(`         → ${hotels.json?.count ?? hotels.json?.data?.length ?? "?"} hotels in DB`);
if (rooms.ok)    console.log(`         → ${rooms.json?.count  ?? rooms.json?.data?.length  ?? "?"} rooms in DB`);
if (bookings.ok) console.log(`         → ${bookings.json?.total ?? bookings.json?.count ?? "?"} bookings in DB`);
if (guests.ok)   console.log(`         → ${guests.json?.count  ?? guests.json?.data?.length  ?? "?"} guests in DB`);

// ── PROMO ─────────────────────────────────────────────────
console.log("\n  ── PROMO (/api/promo) ──────────────────────────────────────────────");
const promoValid   = await req("POST", `${API}/promo/validate`, { code: "LUXE10",  subtotal: 5000 });
const promoInvalid = await req("POST", `${API}/promo/validate`, { code: "FAKE99",  subtotal: 5000 });
const promoEmpty   = await req("POST", `${API}/promo/validate`, {});
check("POST /api/promo/validate (LUXE10 → valid)",   promoValid,   200, true);
check("POST /api/promo/validate (FAKE99 → invalid)", promoInvalid, 200, true);
check("POST /api/promo/validate (empty  → 400)",     promoEmpty,   400, false);
if (promoValid.ok) console.log(`         → discount: ${promoValid.json?.discountPct}% = ₹${promoValid.json?.discountAmount} off ₹5000`);

// ── 404 HANDLER ───────────────────────────────────────────
console.log("\n  ── ERROR HANDLING ──────────────────────────────────────────────────");
check("GET  /api/nonexistent (404)",  await req("GET", `${API}/nonexistent`), 404, false);

// ── WEBSOCKET / SOCKET.IO ─────────────────────────────────
console.log("\n  ── REAL-TIME (WebSocket + Socket.IO) ───────────────────────────────");

// Test raw WebSocket /ws endpoint
const wsResult = await new Promise((resolve) => {
  try {
    const ws = new WebSocket(`ws://localhost:5000/ws?role=user`);
    const t  = setTimeout(() => { ws.close(); resolve({ ok: false, msg: "timeout" }); }, 3000);
    ws.onopen    = () => { clearTimeout(t); ws.close(); resolve({ ok: true,  msg: "connected" }); };
    ws.onerror   = (e) => { clearTimeout(t); resolve({ ok: false, msg: "error" }); };
  } catch (e) { resolve({ ok: false, msg: e.message }); }
});
if (wsResult.ok) ok("WS   /ws?role=user  (visitor tracking)", 101, "WebSocket handshake OK");
else             bad("WS   /ws?role=user  (visitor tracking)", 0,   wsResult.msg);

// Test Socket.IO HTTP upgrade endpoint
const sioResult = await req("GET", `${BASE}/socket.io/?EIO=4&transport=polling`);
if (sioResult.status === 200) ok("HTTP /socket.io polling transport", 200, "Socket.IO polling OK");
else                          bad("HTTP /socket.io polling transport", sioResult.status, sioResult.json?.message || "");

// ── SUMMARY ───────────────────────────────────────────────
console.log("\n" + "═".repeat(75));
console.log(`  RESULTS:  ✅ ${pass} passed   ⚠️  ${warn} warnings   ❌ ${fail} failed`);
console.log("═".repeat(75));

// Production readiness verdict
const total = pass + warn + fail;
const pct   = Math.round((pass / total) * 100);
console.log(`\n  Score: ${pct}% (${pass}/${total} checks passed)`);

if (fail === 0 && warn === 0) {
  console.log("  Verdict: ✅ ALL CHECKS PASSED — backend is healthy\n");
} else if (fail === 0) {
  console.log("  Verdict: ⚠️  PASSING WITH WARNINGS — review warnings above\n");
} else {
  console.log(`  Verdict: ❌ ${fail} FAILURE(S) — fix before deploying\n`);
}
