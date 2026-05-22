import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Download, Plus, MoreVertical,
  CalendarCheck, Clock, LogIn, DollarSign, Filter, X,
  AlertTriangle, Users, Baby,
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import Topbar from "@/components/Topbar";
import PageHeader from "@/components/PageHeader";
import StatsCard from "@/components/StatsCard";
import StatusBadge from "@/components/StatusBadge";
import Modal from "@/components/Modal";
import { useBookings, Booking } from "@/context/BookingsContext";
import { cancelBooking as apiCancelBooking, getBookingById as apiGetBookingById } from "@/services/api";

// Map room number initials → hotel name
// Room numbers follow pattern: initials-number (e.g. hdl-101, tas-101, apl-101)
const HOTEL_INITIALS_MAP: Record<string, string> = {
  hdl: "Hôtel de Lumière",
  tas: "The Azure Skyline",
  cbr: "Coral Bay Resort",
  apl: "Alpine Peak Lodge",
  tgm: "The Grand Metropolitan",
  scs: "Santorini Cliff Suites",
};

function resolveHotelName(roomNumber: string): string {
  if (!roomNumber) return "";
  // Format: "hdl-101" → prefix "hdl"
  const prefix = roomNumber.split("-")[0]?.toLowerCase();
  if (prefix && HOTEL_INITIALS_MAP[prefix]) return HOTEL_INITIALS_MAP[prefix];
  // Legacy format: "h1_r1" → hotel id "h1"
  const legacyPrefix = roomNumber.split("_")[0]?.toLowerCase();
  const legacyMap: Record<string, string> = {
    h1: "Hôtel de Lumière", h2: "The Azure Skyline", h3: "Coral Bay Resort",
    h4: "Alpine Peak Lodge", h5: "The Grand Metropolitan", h6: "Santorini Cliff Suites",
  };
  return legacyMap[legacyPrefix] || "";
}

const formatAadhaar = (aadhaar?: string) => {
  if (!aadhaar) return "—";
  const cleaned = aadhaar.replace(/\s/g, "");
  if (cleaned.length < 4) return cleaned;
  return `**** **** ${cleaned.slice(-4)}`;
};

export default function Bookings() {
  const navigate = useNavigate();
  // Use BookingsContext as single source of truth — it handles fetching,
  // caching, debouncing and real-time Socket.IO updates.
  const { bookings, loading, addBooking, updateStatus, liveAlerts, refetch } = useBookings();

  // Normalise booking shape for cancel action (backend uses _id)
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [propertyFilter, setPropertyFilter] = useState("All Properties");
  const [detailBooking, setDetailBooking] = useState<Booking | null>(null);
  const [detailFull, setDetailFull] = useState<any | null>(null); // full backend booking with adults
  const [page, setPage] = useState(1);
  const [showNewBooking, setShowNewBooking] = useState(false);
  const [nbSubmitted, setNbSubmitted] = useState(false);
  const PER_PAGE = 8;

  // Simple cancel confirmation state (no reason required for admin)
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Open detail modal — fetch full booking data including additional guests
  const openDetail = async (b: Booking) => {
    setDetailBooking(b);
    setDetailFull(null);
    setConfirmCancel(false);
    try {
      const r: any = await apiGetBookingById(b.id);
      // API returns { success, data: booking } — unwrap one level
      setDetailFull(r?.data?.data || null);
    } catch {}
  };

  // New booking form
  const [nbGuest, setNbGuest] = useState("");
  const [nbEmail, setNbEmail] = useState("");
  const [nbProperty, setNbProperty] = useState("");
  const [nbRoom, setNbRoom] = useState("Deluxe");
  const [nbCheckIn, setNbCheckIn] = useState("");
  const [nbCheckOut, setNbCheckOut] = useState("");
  const [nbAmount, setNbAmount] = useState("");

  const filtered = bookings.filter((b) => {
    const name = b.guestSnapshot.name.toLowerCase();
    const email = b.guestSnapshot.email.toLowerCase();
    const q = search.toLowerCase();
    const matchSearch = !q || name.includes(q) || email.includes(q) || b.id.toLowerCase().includes(q);
    const matchStatus = statusFilter === "All Statuses" || b.status === statusFilter;
    const matchProperty = propertyFilter === "All Properties" || b.property === propertyFilter;
    return matchSearch && matchStatus && matchProperty;
  });

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));

  const stats = {
    total: bookings.length,
    pending: bookings.filter((b) => b.status === "Pending").length,
    confirmed: bookings.filter((b) => b.status === "Confirmed").length,
    revenue: bookings.reduce((s, b) => s + b.totalAmount, 0),
  };

  const handleExport = () => {
    const rows = [
      ["Booking ID", "Guest", "Email", "Property", "Room Type", "Check-in", "Check-out", "Nights", "Total", "Status"],
      ...bookings.map((b) => [
        b.id, b.guestSnapshot.name, b.guestSnapshot.email,
        b.property, b.room.type, b.checkIn, b.checkOut,
        b.nights, `$${b.totalAmount}`, b.status,
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "bookings-export.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleNewBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const checkInDate = new Date(nbCheckIn);
    const checkOutDate = new Date(nbCheckOut);
    const nights = Math.max(1, Math.round((checkOutDate.getTime() - checkInDate.getTime()) / 86400000));
    addBooking({
      guestSnapshot: { name: nbGuest, email: nbEmail },
      room: { type: nbRoom, roomNumber: nbProperty },
      checkIn: nbCheckIn,
      checkOut: nbCheckOut,
      nights,
      totalAmount: parseFloat(nbAmount) || 0,
      status: "Confirmed",
      property: nbProperty,
    });
    setNbSubmitted(true);
    setTimeout(() => {
      setShowNewBooking(false);
      setNbSubmitted(false);
      setNbGuest(""); setNbEmail(""); setNbProperty("");
      setNbRoom("Deluxe"); setNbCheckIn(""); setNbCheckOut(""); setNbAmount("");
    }, 1200);
  };

  const handleCancel = async () => {
    if (!detailBooking) return;
    setCancelling(true);
    try {
      await apiCancelBooking(detailBooking.id, "Cancelled by admin");
      updateStatus(detailBooking.id, "Cancelled");
    } catch {
      updateStatus(detailBooking.id, "Cancelled");
    }
    refetch();
    setCancelling(false);
    setDetailBooking(null);
    setDetailFull(null);
    setConfirmCancel(false);
  };

  const properties = [...new Set(bookings.map((b) => b.property))];

  return (
    <AdminLayout>
      <Topbar title="Bookings" searchPlaceholder="Search bookings, guests, or IDs..." />
      <div className="p-6">
        <PageHeader
          title="Bookings Management"
          subtitle="Manage and monitor guest reservations across all properties."
          actions={
            <>
              <button onClick={handleExport}
                className="flex items-center gap-2 text-sm font-medium text-text-secondary border border-border rounded-lg px-4 py-2 hover:bg-surface-3 transition-colors">
                <Download className="w-4 h-4" /> Export Data
              </button>
              <button onClick={() => setShowNewBooking(true)}
                className="flex items-center gap-2 text-sm font-semibold bg-primary text-white rounded-lg px-4 py-2 hover:bg-primary-dark transition-colors">
                <Plus className="w-4 h-4" /> New Reservation
              </button>
            </>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatsCard title="Total Bookings" value={loading ? "—" : stats.total.toLocaleString()} change={loading ? "—" : `${stats.confirmed} confirmed`} trend="up"
            icon={<CalendarCheck className="w-5 h-5 text-primary" />} iconBg="bg-primary-light" />
          <StatsCard title="Pending" value={loading ? "—" : stats.pending} change="Requiring immediate action"
            icon={<Clock className="w-5 h-5 text-warning" />} iconBg="bg-warning-light" />
          <StatsCard title="Confirmed" value={loading ? "—" : stats.confirmed} change="Active reservations"
            icon={<LogIn className="w-5 h-5 text-success" />} iconBg="bg-success-light" />
          <StatsCard title="Net Revenue" value={loading ? "—" : `$${stats.revenue.toLocaleString()}`} change={loading ? "—" : `${stats.total} bookings total`}
            trend="up" icon={<DollarSign className="w-5 h-5 text-text-secondary" />} iconBg="bg-surface-3" />
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-border shadow-card">
          {/* Filters */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border flex-wrap">
            <select value={propertyFilter} onChange={(e) => { setPropertyFilter(e.target.value); setPage(1); }}
              className="text-sm border border-border rounded-lg px-3 py-2 outline-none text-text-secondary">
              <option>All Properties</option>
              {properties.map((p) => <option key={p}>{p}</option>)}
            </select>
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="text-sm border border-border rounded-lg px-3 py-2 outline-none text-text-secondary">
              <option>All Statuses</option>
              <option>Confirmed</option><option>Pending</option>
              <option>Cancelled</option><option>Completed</option>
            </select>
            <div className="flex items-center gap-2 bg-surface-3 rounded-lg px-3 py-2 flex-1 min-w-[180px]">
              <Search className="w-3.5 h-3.5 text-muted" />
              <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search guest or booking ID..."
                className="bg-transparent text-sm outline-none w-full placeholder:text-muted" />
              {search && (
                <button onClick={() => setSearch("")} className="text-muted hover:text-text-primary">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button onClick={() => { setSearch(""); setStatusFilter("All Statuses"); setPropertyFilter("All Properties"); setPage(1); }}
              className="flex items-center gap-1.5 text-xs font-semibold border border-border text-text-secondary px-3 py-2 rounded-lg hover:bg-surface-3 transition-colors">
              <Filter className="w-3.5 h-3.5" /> Clear Filters
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {["Booking ID", "Guest", "Govt ID Number", "Property", "Room Type", "Stay Dates", "Booked At", "Total", "Status", "Action"].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-muted uppercase tracking-wider px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  // Loading skeleton rows
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      {[...Array(10)].map((_, j) => (
                        <td key={j} className="px-5 py-4">
                          <div className="h-4 bg-surface-3 rounded animate-pulse" style={{ width: j === 0 ? "80%" : j === 1 ? "60%" : "70%" }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-5 py-12 text-center text-muted text-sm">
                      No bookings found. Try adjusting your filters.
                    </td>
                  </tr>
                ) : paginated.map((b, i) => (
                  <tr key={b.id} className="border-b border-border last:border-0 hover:bg-surface-2 transition-colors">
                    <td className="px-5 py-4 text-sm font-semibold text-primary">#{b.id}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-light grid place-items-center shrink-0">
                          <span className="text-primary text-xs font-bold">{b.guestSnapshot.name.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-text-primary">{b.guestSnapshot.name}</p>
                          <p className="text-xs text-muted">{b.guestSnapshot.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm font-medium text-text-secondary">
                      {formatAadhaar(b.guestSnapshot.id)}
                    </td>
                    <td className="px-5 py-4 text-sm text-text-secondary">{b.property}</td>
                    <td className="px-5 py-4 text-sm text-text-secondary">{b.room.type}</td>
                    <td className="px-5 py-4">
                      <p className="text-xs text-text-secondary">
                        {new Date(b.checkIn).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        {" – "}
                        {new Date(b.checkOut).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                      <p className="text-xs text-muted">{b.nights} night{b.nights !== 1 ? "s" : ""}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-xs text-text-secondary">
                        {new Date(b.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                      <p className="text-xs text-muted">
                        {new Date(b.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-text-primary">${b.totalAmount.toLocaleString()}</td>
                    <td className="px-5 py-4"><StatusBadge status={b.status} /></td>
                    <td className="px-5 py-4">
                      <button onClick={() => openDetail(b)}
                        className="text-muted hover:text-text-primary transition-colors p-1 rounded hover:bg-surface-3">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-border">
            <p className="text-xs text-muted">
              Showing {filtered.length === 0 ? 0 : (page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length} entries
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
                className="px-3 py-1.5 text-xs border border-border rounded-lg text-muted hover:bg-surface-3 disabled:opacity-40">
                Previous
              </button>
              {[...Array(Math.min(totalPages, 5))].map((_, i) => (
                <button key={i} onClick={() => setPage(i + 1)}
                  className={`px-3 py-1.5 text-xs rounded-lg ${page === i + 1 ? "bg-primary text-white" : "border border-border text-muted hover:bg-surface-3"}`}>
                  {i + 1}
                </button>
              ))}
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
                className="px-3 py-1.5 text-xs border border-border rounded-lg text-muted hover:bg-surface-3 disabled:opacity-40">
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Insight cards */}
        <div className="grid md:grid-cols-2 gap-4 mt-4">
          <div className="bg-gradient-to-br from-[#1a1f2e] to-[#2d3748] rounded-xl p-5 text-white">
            <h4 className="font-semibold text-sm mb-1">Property Insights</h4>
            <p className="text-white/60 text-xs mb-4">View demand analytics across all properties.</p>
            <button onClick={() => navigate("/analytics")}
              className="text-xs font-semibold bg-white/10 hover:bg-white/20 px-4 py-2 rounded-lg transition-colors">
              View Analytics →
            </button>
          </div>
          <div className="bg-white rounded-xl border border-border p-5 shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 bg-primary-light rounded grid place-items-center">
                <span className="text-primary text-xs">✦</span>
              </div>
              <h4 className="font-semibold text-sm text-text-primary">Revenue Overview</h4>
            </div>
            <p className="text-xs text-muted mb-4">
              Total revenue from {bookings.length} bookings: <strong>${stats.revenue.toLocaleString()}</strong>
            </p>
            <button onClick={() => navigate("/revenue")}
              className="text-xs font-semibold text-primary hover:underline">
              View Revenue Details →
            </button>
          </div>
        </div>
      </div>

      {/* ── Detail Modal ── */}
      <Modal isOpen={!!detailBooking} onClose={() => { setDetailBooking(null); setDetailFull(null); setConfirmCancel(false); }} title="Booking Details">
        {detailBooking && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              {([
                ["Booking ID", `#${detailBooking.id}`],
                ["Status", null],
                ["Guest Name", detailBooking.guestSnapshot.name],
                ["Email", detailBooking.guestSnapshot.email],
                ["Property", detailBooking.property],
                ["Room Type", detailBooking.room.type],
                ["Check-in", new Date(detailBooking.checkIn).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })],
                ["Check-out", new Date(detailBooking.checkOut).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })],
                ["Nights", `${detailBooking.nights} night${detailBooking.nights !== 1 ? "s" : ""}`],
                ["Total Amount", `$${detailBooking.totalAmount.toLocaleString()}`],
              ] as [string, string | null][]).map(([label, value]) => (
                <div key={label} className="bg-surface-2 rounded-lg p-3">
                  <p className="text-xs text-muted uppercase tracking-wider font-semibold mb-0.5">{label}</p>
                  {label === "Status" ? <StatusBadge status={detailBooking.status} /> : <p className="font-medium text-text-primary text-sm">{value}</p>}
                </div>
              ))}
            </div>

            {detailFull?.additionalAdults?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Additional Adults ({detailFull.additionalAdults.length})
                </p>
                <div className="space-y-2">
                  {detailFull.additionalAdults.map((a: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 bg-surface-2 rounded-lg px-3 py-2.5">
                      <div className="w-8 h-8 rounded-full bg-primary-light grid place-items-center shrink-0">
                        <span className="text-primary text-xs font-bold">{a.name?.charAt(0) || "A"}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-text-primary">{a.name}</p>
                        <p className="text-xs text-muted">
                          {a.email || "—"} · {a.phone || "—"}
                          {a.id && ` · Govt ID: ${formatAadhaar(a.id)}`}
                        </p>
                        {a.specialRequests && <p className="text-xs text-muted italic mt-0.5">"{a.specialRequests}"</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {detailFull?.additionalChildren?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Baby className="w-3.5 h-3.5" /> Children ({detailFull.additionalChildren.length})
                </p>
                <div className="space-y-2">
                  {detailFull.additionalChildren.map((c: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 bg-surface-2 rounded-lg px-3 py-2.5">
                      <div className="w-8 h-8 rounded-full bg-warning-light grid place-items-center shrink-0">
                        <span className="text-warning text-xs font-bold">{c.name?.charAt(0) || "C"}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-text-primary">{c.name}</p>
                        <p className="text-xs text-muted">
                          Age: {c.age ?? "—"}
                          {c.id && ` · Govt ID: ${formatAadhaar(c.id)}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {detailBooking.status !== "Cancelled" && detailBooking.status !== "Completed" && (
              <div className="border-t border-border pt-4">
                {!confirmCancel ? (
                  <div className="flex gap-2">
                    <button onClick={() => setConfirmCancel(true)}
                      className="flex-1 py-2.5 bg-danger-light text-danger rounded-lg text-sm font-semibold hover:bg-danger hover:text-white transition-colors flex items-center justify-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" /> Cancel Booking
                    </button>
                    {detailBooking.status === "Pending" && (
                      <button onClick={() => { updateStatus(detailBooking.id, "Confirmed"); setDetailBooking(null); }}
                        className="flex-1 py-2.5 bg-success-light text-success rounded-lg text-sm font-semibold hover:bg-success hover:text-white transition-colors">
                        Confirm Booking
                      </button>
                    )}
                    {detailBooking.status === "Confirmed" && (
                      <button onClick={() => { updateStatus(detailBooking.id, "Completed"); setDetailBooking(null); }}
                        className="flex-1 py-2.5 bg-primary-light text-primary rounded-lg text-sm font-semibold hover:bg-primary hover:text-white transition-colors">
                        Mark Completed
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-text-primary flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-danger" /> Are you sure you want to cancel this booking?
                    </p>
                    <div className="flex gap-2">
                      <button onClick={() => setConfirmCancel(false)}
                        className="flex-1 py-2.5 border border-border rounded-lg text-sm font-medium text-text-secondary hover:bg-surface-3 transition-colors">
                        Keep Booking
                      </button>
                      <button onClick={handleCancel} disabled={cancelling}
                        className="flex-1 py-2.5 bg-danger text-white rounded-lg text-sm font-semibold hover:bg-danger/90 disabled:opacity-50 transition-colors">
                        {cancelling ? "Cancelling..." : "Yes, Cancel It"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
      <Modal isOpen={showNewBooking} onClose={() => { setShowNewBooking(false); setNbSubmitted(false); }} title="New Reservation">
        {nbSubmitted ? (
          <div className="flex flex-col items-center py-8 gap-3">
            <div className="w-14 h-14 bg-success-light rounded-full grid place-items-center">
              <span className="text-success text-3xl">✓</span>
            </div>
            <p className="font-semibold text-text-primary text-lg">Reservation Created!</p>
            <p className="text-sm text-muted">The booking has been added to the list.</p>
          </div>
        ) : (
          <form onSubmit={handleNewBookingSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">Guest Name *</label>
                <input required value={nbGuest} onChange={(e) => setNbGuest(e.target.value)} placeholder="Full name"
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">Email *</label>
                <input required type="email" value={nbEmail} onChange={(e) => setNbEmail(e.target.value)} placeholder="guest@email.com"
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">Property *</label>
                <select value={nbProperty} onChange={(e) => setNbProperty(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary">
                  {[...new Set(bookings.map((b) => b.property).filter(Boolean))].map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">Room Type *</label>
                <select value={nbRoom} onChange={(e) => setNbRoom(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary">
                  <option>Deluxe</option><option>Suite</option>
                  <option>Standard</option><option>Penthouse</option><option>Executive Suite</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">Check-in *</label>
                <input required type="date" value={nbCheckIn} onChange={(e) => setNbCheckIn(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">Check-out *</label>
                <input required type="date" value={nbCheckOut} onChange={(e) => setNbCheckOut(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">Total Amount ($) *</label>
                <input required type="number" min="0" value={nbAmount} onChange={(e) => setNbAmount(e.target.value)} placeholder="e.g. 1200"
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
              </div>
            </div>
            <button type="submit"
              className="w-full bg-primary text-white py-3 rounded-xl font-semibold text-sm hover:bg-primary-dark transition-colors">
              Create Reservation
            </button>
          </form>
        )}
      </Modal>
    </AdminLayout>
  );
}
