import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Search, CalendarCheck, Phone, Users,
  DollarSign, Clock, CheckCircle, XCircle,
  LogIn, LogOut, RefreshCw, Filter, ChevronLeft, ChevronRight,
  Baby, UserCheck,
} from "lucide-react";
import ManagerLayout from "@/components/ManagerLayout";
import StatusBadge from "@/components/StatusBadge";
import Drawer from "@/components/Drawer";
import { checkInManagerBooking, checkOutManagerBooking, getManagerBookings, cancelBooking, updateDeltaPaymentStatus } from "@/services/api";
import { useSocket } from "@/hooks/useSocket";

type Booking = {
  _id: string;
  bookingRef?: string;
  guestSnapshot: { name: string; email: string; phone?: string; id?: string };
  additionalAdults?: { name: string; email?: string; phone?: string; id?: string }[];
  additionalChildren?: { name: string; age?: number; id?: string }[];
  room?: { type?: string; roomNumber?: string };
  checkIn: string;
  checkOut: string;
  nights?: number;
  totalAmount: number;
  status: string;
  paymentMethod?: string;
  specialRequests?: string;
  createdAt: string;
  hotelName?: string;
  priceDelta?: number;
  deltaPaymentStatus?: string;
  editHistory?: any[];
};

const STATUSES   = ["All", "Confirmed", "Pending", "CheckedIn", "CheckedOut", "Completed", "Cancelled"];
const PAY_METHODS = ["All", "card", "upi", "netbanking", "cash"];
const ROOM_TYPES  = ["All", "Standard", "Deluxe", "Suite", "Penthouse", "Villa"];

const DAYS_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const formatAadhaar = (aadhaar?: string) => {
  if (!aadhaar) return "";
  const cleaned = aadhaar.replace(/\s/g, "");
  if (cleaned.length < 4) return cleaned;
  return `**** **** ${cleaned.slice(-4)}`;
};

export default function Bookings() {
  // Ensure calendar displays current date properly
  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();
  const todayDate = today.getDate();

  const [searchParams] = useSearchParams();
  const [bookings, setBookings]   = useState<Booking[]>([]);
  const [loading, setLoading]     = useState(true);
  const [view, setView]           = useState<"list" | "calendar">("list");
  const [search, setSearch]       = useState("");

  useEffect(() => {
    const q = searchParams.get("search");
    if (q) setSearch(q);
  }, [searchParams]);

  const [filterStatus, setFilterStatus]   = useState("All");
  const [filterPayment, setFilterPayment] = useState("All");
  const [filterType, setFilterType]       = useState("All");
  const [selected, setSelected]   = useState<Booking | null>(null);
  const [cancelTarget, setCancelTarget]   = useState<Booking | null>(null);
  const [cancelReason, setCancelReason]   = useState("");
  const [cancelling, setCancelling]       = useState(false);
  const [resolvingDelta, setResolvingDelta] = useState(false);
  const [refreshing, setRefreshing]       = useState(false);
  const [calDate, setCalDate]     = useState(new Date());

  const load = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res: any = await getManagerBookings();
      setBookings(res?.data || []);
    } catch { setBookings([]); }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useSocket("newBooking", useCallback(() => load(), [load]));

  const filtered = bookings.filter((b) => {
    const matchSearch  = !search ||
      (b.guestSnapshot?.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (b.guestSnapshot?.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (b.bookingRef || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus  = filterStatus  === "All" || b.status === filterStatus;
    const matchPayment = filterPayment === "All" || b.paymentMethod === filterPayment;
    const matchType    = filterType    === "All" || b.room?.type === filterType;
    return matchSearch && matchStatus && matchPayment && matchType;
  });

  const sorted = [...filtered].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Auto-open deep-linked booking detail drawer
  useEffect(() => {
    if (sorted.length === 1 && search.toLowerCase().startsWith("ls-") && !selected) {
      setSelected(sorted[0]);
    }
  }, [sorted, search, selected]);

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await cancelBooking(cancelTarget._id, cancelReason);
      await load();
      setCancelTarget(null);
      setCancelReason("");
      if (selected?._id === cancelTarget._id) setSelected(null);
    } catch { /* silent */ }
    setCancelling(false);
  };

  const handleCheckIn = async (booking: Booking) => {
    await checkInManagerBooking(booking._id).catch(() => {});
    setBookings((prev) =>
      prev.map((b) => b._id === booking._id ? { ...b, status: "CheckedIn" } : b)
    );
    setSelected((prev) => prev ? { ...prev, status: "CheckedIn" } : null);
  };

  const handleCheckOut = async (booking: Booking) => {
    await checkOutManagerBooking(booking._id).catch(() => {});
    setBookings((prev) =>
      prev.map((b) => b._id === booking._id ? { ...b, status: "CheckedOut" } : b)
    );
    setSelected((prev) => prev ? { ...prev, status: "CheckedOut" } : null);
  };

  const nights = (b: Booking) =>
    b.nights ?? Math.max(1, Math.round(
      (new Date(b.checkOut).getTime() - new Date(b.checkIn).getTime()) / 86400000
    ));

  const statusCounts = STATUSES.slice(1).reduce((acc, s) => {
    acc[s] = bookings.filter((b) => b.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  // Calendar helpers
  const calYear  = calDate.getFullYear();
  const calMonth = calDate.getMonth();
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  const bookingsOnDay = (day: number) => {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return bookings.filter((b) => {
      const ci = b.checkIn?.slice(0, 10);
      const co = b.checkOut?.slice(0, 10);
      return ci === dateStr || co === dateStr;
    });
  };

  const statusDot: Record<string, string> = {
    Confirmed: "bg-success", Pending: "bg-warning",
    Cancelled: "bg-danger",  Completed: "bg-muted", CheckedIn: "bg-success", CheckedOut: "bg-muted",
  };

  return (
    <ManagerLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Bookings</h1>
          <p className="text-sm text-muted mt-0.5">{bookings.length} total bookings</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center border border-white/10 rounded-xl overflow-hidden bg-white/5">
            <button onClick={() => setView("list")}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${view === "list" ? "bg-primary text-white" : "text-dim hover:text-bright hover:bg-white/5"}`}>
              List
            </button>
            <button onClick={() => setView("calendar")}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${view === "calendar" ? "bg-primary text-white" : "text-dim hover:text-bright hover:bg-white/5"}`}>
              Calendar
            </button>
          </div>
          <button onClick={() => load(true)} disabled={refreshing}
            className="flex items-center gap-2 text-sm font-medium text-soft border border-white/10 rounded-xl px-4 py-2 hover:bg-white/5 transition-colors disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Status pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setFilterStatus(s)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              filterStatus === s ? "bg-primary text-white" : "bg-white/5 border border-white/10 text-soft hover:border-gold/40 hover:text-bright"
            }`}>
            {s}{s !== "All" && statusCounts[s] !== undefined ? ` (${statusCounts[s]})` : ""}
          </button>
        ))}
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dim pointer-events-none" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search guest, email, ref..."
            className="w-full pl-9 pr-4 py-2 border border-white/10 rounded-xl text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/10 bg-white/5 text-bright placeholder:text-dim" />
        </div>
        <div className="flex items-center gap-1.5 text-dim">
          <Filter className="w-4 h-4" />
        </div>
        <select value={filterPayment} onChange={(e) => setFilterPayment(e.target.value)}
          className="glass-select border border-white/10 rounded-xl px-3 py-2 text-sm outline-none">
          <option value="All">All Payments</option>
          {PAY_METHODS.slice(1).map((m) => <option key={m} value={m}>{m === "card" ? "Credit Card" : m === "upi" ? "UPI" : m === "netbanking" ? "Net Banking" : "Cash"}</option>)}
        </select>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}
          className="glass-select border border-white/10 rounded-xl px-3 py-2 text-sm outline-none">
          <option value="All">All Room Types</option>
          {ROOM_TYPES.slice(1).map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>

      {view === "list" ? (
        /* ── List View ── */
        <div className="flex gap-4 h-[calc(100vh-340px)] min-h-80">
          {/* Booking cards */}
          <div className={`flex flex-col ${selected ? "w-[400px] shrink-0" : "flex-1"} transition-all`}>
            <div className="flex-1 overflow-y-auto scrollbar-thin space-y-2 pr-1">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                </div>
              ) : sorted.length === 0 ? (
                <div className="glass-card rounded-2xl border border-white/10 p-10 text-center">
                  <CalendarCheck className="w-10 h-10 text-white/10 mx-auto mb-3" />
                  <p className="text-sm text-dim">No bookings found</p>
                </div>
              ) : sorted.map((b) => (
                <button key={b._id} onClick={() => setSelected(selected?._id === b._id ? null : b)}
                  className={`w-full text-left glass-card rounded-2xl border p-4 hover:shadow-2xl transition-all ${
                    selected?._id === b._id ? "border-gold/50 ring-2 ring-gold/20" : "border-white/10 hover:border-white/20"
                  }`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl grid place-items-center shrink-0"
                        style={{ background: "rgba(212,168,67,0.15)", border: "1px solid rgba(212,168,67,0.25)" }}>
                        <span className="text-gold text-xs font-bold">{(b.guestSnapshot?.name || "G").charAt(0)}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-bright leading-tight">{b.guestSnapshot?.name || "Guest"}</p>
                        <p className="text-xs text-dim">{b.guestSnapshot?.email}</p>
                      </div>
                    </div>
                    <StatusBadge status={b.status} />
                  </div>
                  <div className="flex items-center justify-between text-xs text-dim mt-2">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(b.checkIn).toLocaleDateString()} → {new Date(b.checkOut).toLocaleDateString()}
                    </span>
                    <span className="font-semibold text-bright">${b.totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-dim">
                    {b.bookingRef && <span>Ref: {b.bookingRef}</span>}
                    {b.room?.type && <span>· {b.room.type}</span>}
                    {b.paymentMethod && <span>· {b.paymentMethod}</span>}
                    {b.createdAt && (
                      <span className="text-[11px] text-accent/90 font-medium bg-accent/10 px-2 py-0.5 rounded">
                        Booked: {new Date(b.createdAt).toLocaleDateString()} {new Date(b.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    )}
                    {(b.additionalAdults?.length || 0) > 0 && (
                      <span className="flex items-center gap-1">
                        <UserCheck className="w-3 h-3" /> +{b.additionalAdults!.length} adults
                      </span>
                    )}
                    {(b.additionalChildren?.length || 0) > 0 && (
                      <span className="flex items-center gap-1">
                        <Baby className="w-3 h-3" /> {b.additionalChildren!.length} children
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Detail panel */}
          {selected && (
            <div className="flex-1 rounded-2xl border border-white/10 overflow-y-auto scrollbar-thin animate-slide-up"
              style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)" }}>
              <div className="sticky top-0 border-b px-6 py-4 flex items-center justify-between z-10"
                style={{ background: "rgba(10,22,40,0.95)", borderColor: "rgba(255,255,255,0.08)" }}>
                <div>
                  <h2 className="font-bold text-bright">{selected.guestSnapshot?.name}</h2>
                  <p className="text-xs text-dim">{selected.bookingRef ? `Ref: ${selected.bookingRef}` : `ID: ${selected._id.slice(-8)}`}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={selected.status} />
                  <button onClick={() => setSelected(null)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-dim hover:bg-white/10 hover:text-bright transition-colors">
                    ✕
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-5">
                {/* Lead Guest */}
                <section>
                  <h3 className="text-xs font-semibold text-dim uppercase tracking-wider mb-3">Lead Guest</h3>
                  <div className="rounded-xl p-4 space-y-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl grid place-items-center"
                        style={{ background: "rgba(212,168,67,0.15)", border: "1px solid rgba(212,168,67,0.25)" }}>
                        <span className="text-gold font-bold">{selected.guestSnapshot.name.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-bright">{selected.guestSnapshot.name}</p>
                        <p className="text-xs text-dim">{selected.guestSnapshot.email}</p>
                      </div>
                    </div>
                    {selected.guestSnapshot.phone && (
                      <div className="flex items-center gap-2 text-sm text-soft">
                        <Phone className="w-3.5 h-3.5 text-gold" /> {selected.guestSnapshot.phone}
                      </div>
                    )}
                  </div>
                </section>

                {/* Additional Adults */}
                {selected.additionalAdults && selected.additionalAdults.length > 0 && (
                  <section>
                    <h3 className="text-xs font-semibold text-dim uppercase tracking-wider mb-3">
                      Additional Adults ({selected.additionalAdults.length})
                    </h3>
                    <div className="space-y-2">
                      {selected.additionalAdults.map((a, i) => (
                        <div key={i} className="rounded-xl p-3 flex items-center gap-3"
                          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                          <div className="w-7 h-7 rounded-lg grid place-items-center shrink-0"
                            style={{ background: "rgba(212,168,67,0.15)" }}>
                            <UserCheck className="w-3.5 h-3.5 text-gold" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-bright">{a.name}</p>
                            <p className="text-xs text-dim">
                              {a.email || "—"}
                              {a.id && ` · Govt ID: ${formatAadhaar(a.id)}`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Children */}
                {selected.additionalChildren && selected.additionalChildren.length > 0 && (
                  <section>
                    <h3 className="text-xs font-semibold text-dim uppercase tracking-wider mb-3">
                      Children ({selected.additionalChildren.length})
                    </h3>
                    <div className="space-y-2">
                      {selected.additionalChildren.map((c, i) => (
                        <div key={i} className="rounded-xl p-3 flex items-center gap-3"
                          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                          <div className="w-7 h-7 rounded-lg grid place-items-center shrink-0"
                            style={{ background: "rgba(212,168,67,0.15)" }}>
                            <Baby className="w-3.5 h-3.5 text-gold" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-bright">{c.name}</p>
                            <p className="text-xs text-dim">
                              Age {c.age ?? "—"}
                              {c.id && ` · Govt ID: ${formatAadhaar(c.id)}`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Stay Details */}
                <section>
                  <h3 className="text-xs font-semibold text-dim uppercase tracking-wider mb-3">Stay Details</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { icon: <LogIn className="w-3.5 h-3.5 text-success" />, label: "Check-in", value: new Date(selected.checkIn).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) },
                      { icon: <LogOut className="w-3.5 h-3.5 text-danger" />, label: "Check-out", value: new Date(selected.checkOut).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) },
                      { icon: <Clock className="w-3.5 h-3.5 text-gold" />, label: "Duration", value: `${nights(selected)} nights` },
                      { icon: <Users className="w-3.5 h-3.5 text-gold" />, label: "Room", value: `${selected.room?.type || "—"}${selected.room?.roomNumber ? ` #${selected.room.roomNumber}` : ""}` },
                      { icon: <Clock className="w-3.5 h-3.5 text-sky-400" />, label: "Booked At", value: `${new Date(selected.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} ${new Date(selected.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}` },
                    ].map(({ icon, label, value }) => (
                      <div key={label} className="rounded-xl p-3"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                        <div className="flex items-center gap-2 mb-1">{icon}<span className="text-xs text-dim font-medium">{label}</span></div>
                        <p className="text-sm font-semibold text-bright">{value}</p>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Payment */}
                <section>
                  <h3 className="text-xs font-semibold text-dim uppercase tracking-wider mb-3">Payment</h3>
                  <div className="rounded-xl p-4 space-y-2"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-soft">Total Amount</span>
                      <span className="font-bold text-bright text-base">${selected.totalAmount.toLocaleString()}</span>
                    </div>
                    {selected.paymentMethod && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-soft">Method</span>
                        <span className="text-bright capitalize">{selected.paymentMethod}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-soft flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5" /> Status
                      </span>
                      <StatusBadge status={
                        selected.status === "Cancelled" ? "Cancelled" :
                        selected.status === "Confirmed" || selected.status === "Completed" ? "Confirmed" : "Pending"
                      } />
                    </div>
                  </div>
                </section>

                {/* Delta Pricing Reconciliation (Manager Action) */}
                {selected.deltaPaymentStatus && selected.deltaPaymentStatus !== "none" && (
                  <section>
                    <h3 className="text-xs font-semibold text-dim uppercase tracking-wider mb-2">Delta Pricing Reconciliation</h3>
                    <div className="rounded-xl p-4 space-y-3"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-soft">Delta Amount</span>
                        <span className={`font-bold ${selected.priceDelta && selected.priceDelta > 0 ? "text-orange-400" : "text-green-400"}`}>
                          {selected.priceDelta && selected.priceDelta > 0 ? "+" : ""}${selected.priceDelta?.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-soft">Status</span>
                        <span className={`px-2 py-0.5 rounded text-xs uppercase tracking-wide font-semibold ${
                          selected.deltaPaymentStatus === "resolved" ? "bg-green-500/20 text-green-400" :
                          selected.deltaPaymentStatus === "pending_collection" ? "bg-orange-500/20 text-orange-400" :
                          "bg-blue-500/20 text-blue-400"
                        }`}>
                          {selected.deltaPaymentStatus.replace("_", " ")}
                        </span>
                      </div>
                      {selected.deltaPaymentStatus !== "resolved" && (
                        <button
                          onClick={async () => {
                            setResolvingDelta(true);
                            try {
                              await updateDeltaPaymentStatus(selected._id, "resolved");
                              // Refresh selected
                              const updated = { ...selected, deltaPaymentStatus: "resolved" };
                              setSelected(updated);
                              load();
                            } catch (err: any) {
                              alert(err.message || "Failed to update delta status");
                            } finally {
                              setResolvingDelta(false);
                            }
                          }}
                          disabled={resolvingDelta}
                          className="w-full bg-success text-white py-2 rounded-xl text-xs font-semibold hover:bg-green-700 transition-colors disabled:opacity-50">
                          {resolvingDelta ? "Updating..." : "Mark Delta as Resolved"}
                        </button>
                      )}
                    </div>
                  </section>
                )}

                {/* Rescheduling History */}
                {selected.editHistory && selected.editHistory.length > 0 && (
                  <section>
                    <h3 className="text-xs font-semibold text-dim uppercase tracking-wider mb-2">Rescheduling History ({selected.editHistory.length})</h3>
                    <div className="space-y-2.5 max-h-40 overflow-y-auto pr-1">
                      {selected.editHistory.map((h: any, idx: number) => {
                        const formattedCI = new Date(h.newCheckIn).toLocaleDateString();
                        const formattedCO = new Date(h.newCheckOut).toLocaleDateString();
                        const prevCI = new Date(h.previousCheckIn).toLocaleDateString();
                        const prevCO = new Date(h.previousCheckOut).toLocaleDateString();
                        return (
                          <div key={idx} className="rounded-xl p-3 text-xs space-y-1.5"
                            style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
                            <div className="flex justify-between font-semibold text-bright">
                              <span>Updated by {h.changedBy}</span>
                              <span className="text-dim">{new Date(h.timestamp).toLocaleDateString()}</span>
                            </div>
                            <div className="text-soft">
                              Dates: <span className="line-through">{prevCI} – {prevCO}</span> → <span className="text-accent font-medium">{formattedCI} – {formattedCO}</span>
                            </div>
                            {h.priceDelta !== 0 && (
                              <div className="font-medium text-bright">
                                Delta: <span className={h.priceDelta > 0 ? "text-orange-400" : "text-green-400"}>
                                  {h.priceDelta > 0 ? "+" : ""}${h.priceDelta.toLocaleString()}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Special Requests */}
                {selected.specialRequests && (
                  <section>
                    <h3 className="text-xs font-semibold text-dim uppercase tracking-wider mb-2">Special Requests</h3>
                    <p className="text-sm text-soft rounded-xl p-3"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      {selected.specialRequests}
                    </p>
                  </section>
                )}

                {/* Actions */}
                <section className="pt-2 space-y-2">
                  {selected.status !== "Cancelled" && selected.status !== "Completed" && selected.status !== "CheckedOut" && (
                    <button onClick={() => { setCancelTarget(selected); setCancelReason(""); }}
                      className="w-full flex items-center justify-center gap-2 border border-danger/30 text-danger rounded-xl py-2.5 text-sm font-semibold hover:bg-danger/10 transition-colors">
                      <XCircle className="w-4 h-4" /> Cancel Booking
                    </button>
                  )}
                  {selected.status === "Confirmed" && (
                    <button onClick={() => handleCheckIn(selected)}
                      className="w-full flex items-center justify-center gap-2 bg-success text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-green-700 transition-colors">
                      <CheckCircle className="w-4 h-4" /> Mark Checked-In
                    </button>
                  )}
                  {selected.status === "CheckedIn" && (
                    <button onClick={() => handleCheckOut(selected)}
                      className="w-full flex items-center justify-center gap-2 bg-primary text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-primary-dark transition-colors">
                      <CheckCircle className="w-4 h-4" /> Mark Checked-Out
                    </button>
                  )}
                </section>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ── Calendar View ── */
        <div className="glass-card rounded-2xl border border-white/10 p-5">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-5">
            <button onClick={() => setCalDate(new Date(calYear, calMonth - 1, 1))}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-dim hover:bg-white/10 hover:text-bright transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="font-bold text-bright">{MONTHS_FULL[calMonth]} {calYear}</h2>
            <button onClick={() => setCalDate(new Date(calYear, calMonth + 1, 1))}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-dim hover:bg-white/10 hover:text-bright transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS_SHORT.map((d) => (
              <div key={d} className="text-center text-xs font-semibold text-dim py-1">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayBookings = bookingsOnDay(day);
              const isToday = todayYear === calYear && todayMonth === calMonth && todayDate === day;
              return (
                <div key={day}
                  className={`min-h-[72px] rounded-xl p-1.5 border transition-colors cursor-pointer ${
                    isToday ? "border-gold/50 bg-gold/15 ring-2 ring-gold/30" : "border-white/5 hover:bg-white/5"
                  }`}
                  onClick={() => { setCalDate(new Date(calYear, calMonth, day)); }}>
                  <span className={`text-xs font-semibold block mb-1 ${isToday ? "text-gold" : "text-bright"}`}>
                    {day}
                  </span>
                  <div className="space-y-0.5">
                    {dayBookings.slice(0, 3).map((b) => (
                      <button key={b._id} onClick={(e) => { e.stopPropagation(); setSelected(b); setView("list"); }}
                        className={`w-full text-left px-1.5 py-0.5 rounded text-[10px] font-medium text-white truncate ${statusDot[b.status] || "bg-muted"}`}>
                        {b.guestSnapshot?.name?.split(" ")[0] || "Guest"}
                      </button>
                    ))}
                    {dayBookings.length > 3 && (
                      <span className="text-[10px] text-dim font-semibold">+{dayBookings.length - 3} more</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cancel Drawer */}
      <Drawer isOpen={!!cancelTarget} onClose={() => setCancelTarget(null)} title="Cancel Booking" width="w-[400px]">
        <div className="space-y-4">
          <p className="text-sm text-soft">
            Cancel booking for <strong className="text-bright">{cancelTarget?.guestSnapshot?.name}</strong>? This will free up the room.
          </p>
          <div>
            <label className="block text-xs font-semibold text-dim uppercase tracking-wider mb-1.5">Reason (optional)</label>
            <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}
              rows={3} placeholder="Reason for cancellation..."
              className="w-full border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-gold bg-white/5 text-bright placeholder:text-dim resize-none" />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setCancelTarget(null)}
              className="flex-1 border border-white/10 rounded-xl py-2.5 text-sm font-medium text-soft hover:bg-white/5 hover:text-bright transition-colors">
              Keep Booking
            </button>
            <button onClick={handleCancel} disabled={cancelling}
              className="flex-1 bg-danger text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-60">
              {cancelling ? "Cancelling..." : "Cancel Booking"}
            </button>
          </div>
        </div>
      </Drawer>
    </ManagerLayout>
  );
}
