import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Download, UserPlus, Users, Crown, DollarSign, Star, Edit2, X } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import Topbar from "@/components/Topbar";
import PageHeader from "@/components/PageHeader";
import StatsCard from "@/components/StatsCard";
import StatusBadge from "@/components/StatusBadge";
import Modal from "@/components/Modal";
import { Guest } from "@/context/GuestsContext";
import { useBookings } from "@/context/BookingsContext";
import { getGuests as apiGetGuests, getGuestById as apiGetGuestById } from "@/services/api";
import socket from "@/services/socket";

const HOTEL_INITIALS_MAP: Record<string, string> = {
  hdl: "Hôtel de Lumière", tas: "The Azure Skyline", cbr: "Coral Bay Resort",
  apl: "Alpine Peak Lodge", tgm: "The Grand Metropolitan", scs: "Santorini Cliff Suites",
};
const HOTEL_LEGACY_MAP: Record<string, string> = {
  h1: "Hôtel de Lumière", h2: "The Azure Skyline", h3: "Coral Bay Resort",
  h4: "Alpine Peak Lodge", h5: "The Grand Metropolitan", h6: "Santorini Cliff Suites",
};

function resolvePreferredHotel(roomNumber: string): string {
  if (!roomNumber) return "";
  const prefix = roomNumber.split("-")[0]?.toLowerCase();
  if (HOTEL_INITIALS_MAP[prefix]) return HOTEL_INITIALS_MAP[prefix];
  const legacy = roomNumber.split("_")[0]?.toLowerCase();
  return HOTEL_LEGACY_MAP[legacy] || "";
}

function normalizeGuestBooking(b: any) {
  const checkIn = b.checkIn ? new Date(b.checkIn) : null;
  const checkOut = b.checkOut ? new Date(b.checkOut) : null;
  const nights =
    b.nights ||
    (checkIn && checkOut
      ? Math.max(1, Math.round((checkOut.getTime() - checkIn.getTime()) / 86400000))
      : 1);

  return {
    ...b,
    id: b.id || b.bookingRef || b._id,
    room: {
      ...(b.room || {}),
      type: b.room?.type || b.roomType?.name || "Room",
      roomNumber: b.room?.roomNumber || b.roomNumber || "",
    },
    nights,
  };
}

export default function Guests() {
  const navigate = useNavigate();
  const { bookings, loading: loadingBookings } = useBookings();
  const [backendGuests, setBackendGuests] = useState<any[]>([]);
  const [loadingGuests, setLoadingGuests] = useState(true);

  const abortRef = useRef<AbortController | null>(null);
  const fetchSeq = useRef(0);

  const fetchGuests = () => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const seq = fetchSeq.current + 1;
    fetchSeq.current = seq;
    setLoadingGuests(true);
    apiGetGuests()
      .then((r: any) => {
        if (seq !== fetchSeq.current || controller.signal.aborted) return;
        const guestsWithBookings = Array.isArray(r?.data)
          ? r.data.filter((g: any) => Array.isArray(g?.bookings) && g.bookings.length > 0)
          : [];
        setBackendGuests(guestsWithBookings);
      })
      .catch(() => {
        if (seq !== fetchSeq.current || controller.signal.aborted) return;
        setBackendGuests([]);
      })
      .finally(() => {
        if (seq === fetchSeq.current && !controller.signal.aborted) {
          setLoadingGuests(false);
        }
      });
  };

  useEffect(() => {
    fetchGuests();
    
    // Listen for real-time updates to refetch guests list
    const handleUpdate = () => fetchGuests();
    socket.on("newBooking", handleUpdate);
    socket.on("booking_update", handleUpdate);
    socket.on("visitor_update", handleUpdate);

    return () => { 
      if (abortRef.current) abortRef.current.abort(); 
      socket.off("newBooking", handleUpdate);
      socket.off("booking_update", handleUpdate);
      socket.off("visitor_update", handleUpdate);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const guests: Guest[] = backendGuests.map((g: any) => {
        const bookingsList: any[] = g.bookings || [];
        const latestBooking = bookingsList[0];
        // Use stored hotelName first, then resolve from room number
        const roomNum: string = latestBooking?.room?.roomNumber || latestBooking?.roomType?.name || "";
        const preferredHotel =
          latestBooking?.hotelName ||
          resolvePreferredHotel(roomNum) ||
          "LuxeStay";
        return {
          id: g._id,
          name: g.name,
          email: g.email,
          phone: g.phone || "—",
          city: g.city || "—",
          preferredHotel,
          totalVisits: bookingsList.length,
          lifetimeValue: bookingsList.reduce((s: number, b: any) => s + (b.totalAmount || 0), 0),
          status: "Active" as Guest["status"],
        };
      });
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("All Preferences");
  const [detailGuest, setDetailGuest] = useState<Guest | null>(null);
  const [detailAdditional, setDetailAdditional] = useState<any[]>([]);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Guest | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [page, setPage] = useState(1);
  const PER_PAGE = 8;

  const [form, setForm] = useState({ name: "", email: "", phone: "", city: "", preferredHotel: "The Grand Luxe", status: "Active" as Guest["status"] });

  const filtered = guests.filter((g) => {
    const matchSearch = !search || g.name.toLowerCase().includes(search.toLowerCase()) || g.email.toLowerCase().includes(search.toLowerCase());
    const matchTier = tierFilter === "All Preferences" || g.preferredHotel === tierFilter;
    return matchSearch && matchTier;
  });

  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));

  const openRegister = () => {
    setEditTarget(null);
    setForm({ name: "", email: "", phone: "", city: "", preferredHotel: "The Grand Luxe", status: "Active" });
    setSubmitted(false);
    setRegisterOpen(true);
  };

  const handleViewHistory = async (g: Guest) => {
    setDetailAdditional([]);
    try {
      const r: any = await apiGetGuestById(g.id);
      const guestData = r?.data;
      setDetailGuest(guestData ? { ...g, bookings: (guestData.bookings || []).map(normalizeGuestBooking) } : g);
      // Fetch additional guests (adults + children) for this guest
      if (guestData?.additionalGuests?.length) {
        setDetailAdditional(guestData.additionalGuests);
      } else {
        // Fallback: fetch from /api/guests/additional
        const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
        fetch(`${BASE}/guests/additional?email=${encodeURIComponent(g.email)}`)
          .then((res) => res.json())
          .then((d) => setDetailAdditional(d?.data || []))
          .catch(() => {});
      }
      return;
    } catch {
      setDetailGuest(g);
    }
  };

  const openEdit = (g: Guest) => {
    setEditTarget(g);
    setForm({ name: g.name, email: g.email, phone: g.phone, city: g.city, preferredHotel: g.preferredHotel, status: g.status });
    setSubmitted(false);
    setDetailGuest(null);
    setRegisterOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    // For now just close — guest registration via admin is informational only.
    // Real guests are created when they book via the frontend.
    setSubmitted(true);
    setTimeout(() => { setRegisterOpen(false); setSubmitted(false); }, 1000);
  };

  const handleExport = () => {
    const rows = [["Name", "Email", "Phone", "City", "Preferred Hotel", "Total Visits", "Lifetime Value", "Status"],
      ...guests.map((g) => [g.name, g.email, g.phone, g.city, g.preferredHotel, g.totalVisits, `$${g.lifetimeValue}`, g.status])];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "guests.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const guestBookings = (g: Guest) => {
    if (Array.isArray(g.bookings) && g.bookings.length > 0) return g.bookings;
    return bookings.filter((b) => b.guestSnapshot.email === g.email);
  };

  const tierColor: Record<string, string> = {
    "The Grand Luxe": "bg-warning-light text-warning",
    "Bon Vivant": "bg-primary-light text-primary",
    "Spa & Pools": "bg-success-light text-success",
  };

  const vipCount = guests.filter((g) => g.status === "VIP").length;
  const totalLTV = guests.reduce((s, g) => s + g.lifetimeValue, 0);
  
  let recentActivity: any[] = [];
  if (!loadingBookings) {
    recentActivity = bookings.slice(0, 3).map((b) => ({
      label: "Booking",
      desc: `${b.guestSnapshot.name || "Guest"} booked ${b.property || "LuxeStay"}.`,
      time: b.createdAt ? new Date(b.createdAt).toLocaleDateString() : "Recent",
    }));
    if (recentActivity.length === 0 && guests.length > 0) {
      recentActivity.push(...guests.slice(0, 3).map((g) => ({
        label: "Guest",
        desc: `${g.name} is listed as a guest.`,
        time: "Current",
      })));
    }
  }

  return (
    <AdminLayout>
      <Topbar title="Guests" searchPlaceholder="Search guests by name or email..." />
      <div className="p-6">
        <PageHeader
          title="Guest Management"
          subtitle="Oversee and manage guest relationships across your luxury portfolio."
          actions={
            <>
              <button onClick={handleExport}
                className="flex items-center gap-2 text-sm font-medium text-text-secondary border border-border rounded-lg px-4 py-2 hover:bg-surface-3 transition-colors">
                <Download className="w-4 h-4" /> Export List
              </button>
              <button onClick={openRegister}
                className="flex items-center gap-2 text-sm font-semibold bg-primary text-white rounded-lg px-4 py-2 hover:bg-primary-dark transition-colors">
                <UserPlus className="w-4 h-4" /> Register Guest
              </button>
            </>
          }
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatsCard title="Total Guests" value={loadingGuests ? "—" : guests.length.toLocaleString()} change="+10%" trend="up"
            icon={<Users className="w-5 h-5 text-primary" />} iconBg="bg-primary-light" />
          <StatsCard title="VIP Members" value={loadingGuests ? "—" : vipCount} change="Top tier" trend="up"
            icon={<Crown className="w-5 h-5 text-warning" />} iconBg="bg-warning-light" />
          <StatsCard title="Total LTV" value={loadingGuests ? "—" : `$${(totalLTV / 1000).toFixed(0)}k`} change="Stable" trend="neutral"
            icon={<DollarSign className="w-5 h-5 text-success" />} iconBg="bg-success-light" />
          <StatsCard title="Return Rate" value="38%" change="-3%" trend="down"
            icon={<Star className="w-5 h-5 text-danger" />} iconBg="bg-danger-light" />
        </div>

        <div className="bg-white rounded-xl border border-border shadow-card mb-4">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border flex-wrap">
            <select value={tierFilter} onChange={(e) => { setTierFilter(e.target.value); setPage(1); }}
              className="text-sm border border-border rounded-lg px-3 py-2 outline-none text-text-secondary">
              <option>All Preferences</option>
              <option>The Grand Luxe</option><option>Bon Vivant</option><option>Spa & Pools</option>
            </select>
            <div className="flex items-center gap-2 bg-surface-3 rounded-lg px-3 py-2 flex-1 min-w-[180px]">
              <Search className="w-3.5 h-3.5 text-muted" />
              <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search by name or email..."
                className="bg-transparent text-sm outline-none w-full placeholder:text-muted" />
              {search && <button onClick={() => setSearch("")}><X className="w-3.5 h-3.5 text-muted" /></button>}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {["Guest Name", "Contact Info", "Preferred Hotels", "Total Visits", "Lifetime Value", "Status", "Actions"].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-muted uppercase tracking-wider px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadingGuests ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      {[...Array(7)].map((_, j) => (
                        <td key={j} className="px-5 py-4">
                          <div className="h-4 bg-surface-3 rounded animate-pulse" style={{ width: j === 0 ? "70%" : "60%" }} />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : paginated.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-12 text-center text-muted text-sm">No guests found.</td></tr>
                ) : paginated.map((g) => (
                  <tr key={g.id} className="border-b border-border last:border-0 hover:bg-surface-2 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary-light grid place-items-center shrink-0">
                          <span className="text-primary text-sm font-bold">{g.name.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-text-primary">{g.name}</p>
                          <p className="text-xs text-muted">{g.city || "—"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-text-secondary">{g.email}</p>
                      <p className="text-xs text-muted">{g.phone || "—"}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${tierColor[g.preferredHotel] || "bg-surface-3 text-muted"}`}>
                        {g.preferredHotel}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm text-text-secondary">{g.totalVisits}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-text-primary">${g.lifetimeValue.toLocaleString()}</td>
                    <td className="px-5 py-4"><StatusBadge status={g.status} /></td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleViewHistory(g)}
                          className="text-xs font-semibold text-primary hover:underline">
                          View History
                        </button>
                        <button onClick={() => openEdit(g)}
                          className="text-muted hover:text-primary transition-colors p-1 rounded hover:bg-primary-light">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-5 py-3 border-t border-border">
            <p className="text-xs text-muted">Showing {filtered.length === 0 ? 0 : (page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} of {filtered.length} guests</p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
                className="px-3 py-1.5 text-xs border border-border rounded-lg text-muted hover:bg-surface-3 disabled:opacity-40">Previous</button>
              {[...Array(Math.min(totalPages, 5))].map((_, i) => (
                <button key={i} onClick={() => setPage(i + 1)}
                  className={`px-3 py-1.5 text-xs rounded-lg ${page === i + 1 ? "bg-primary text-white" : "border border-border text-muted hover:bg-surface-3"}`}>
                  {i + 1}
                </button>
              ))}
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
                className="px-3 py-1.5 text-xs border border-border rounded-lg text-muted hover:bg-surface-3 disabled:opacity-40">Next</button>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-gradient-to-br from-primary to-primary-dark rounded-xl p-5 text-white">
            <h4 className="font-semibold text-sm mb-1">Guest Experience Insights</h4>
            <p className="text-white/70 text-xs mb-4">Analysis shows increased spa-and-dining visits among VIP guests during weekend stays.</p>
            <button onClick={() => navigate("/analytics")}
              className="text-xs font-semibold bg-white/15 hover:bg-white/25 px-4 py-2 rounded-lg transition-colors">
              View Analytics →
            </button>
          </div>
          <div className="bg-white rounded-xl border border-border p-5 shadow-card">
            <h4 className="font-semibold text-sm text-text-primary mb-3">Recent Activity</h4>
            <div className="space-y-3">
              {loadingBookings ? (
                <p className="text-xs text-muted">Loading activity...</p>
              ) : recentActivity.length === 0 ? (
                <p className="text-xs text-muted">No recent guest activity.</p>
              ) : recentActivity.map((a, i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-text-primary">{a.label}</p>
                    <p className="text-xs text-muted">{a.desc}</p>
                    <p className="text-[10px] text-muted mt-0.5">{a.time}</p>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => navigate("/bookings")}
              className="mt-3 text-xs font-semibold text-primary hover:underline">
              View All Bookings →
            </button>
          </div>
        </div>
      </div>

      {/* Guest Detail Modal */}
      <Modal isOpen={!!detailGuest} onClose={() => { setDetailGuest(null); setDetailAdditional([]); }} title="Guest Profile" size="lg">
        {detailGuest && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary-light grid place-items-center">
                  <span className="text-primary text-xl font-bold">{detailGuest.name.charAt(0)}</span>
                </div>
                <div>
                  <h3 className="font-bold text-text-primary">{detailGuest.name}</h3>
                  <p className="text-sm text-muted">{detailGuest.email}</p>
                  <p className="text-sm text-muted">{detailGuest.phone}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(detailGuest)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-primary border border-primary/30 px-3 py-1.5 rounded-lg hover:bg-primary-light transition-colors">
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </button>
                <StatusBadge status={detailGuest.status} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 text-sm">
              {[
                ["City", detailGuest.city || "—"],
                ["Preferred Hotel", detailGuest.preferredHotel],
                ["Total Visits", String(detailGuest.totalVisits)],
                ["Lifetime Value", `$${detailGuest.lifetimeValue.toLocaleString()}`],
              ].map(([label, value]) => (
                <div key={label} className="bg-surface-2 rounded-lg p-3">
                  <p className="text-xs text-muted uppercase tracking-wider font-semibold mb-0.5">{label}</p>
                  <p className="font-semibold text-text-primary">{value}</p>
                </div>
              ))}
            </div>
            <div>
              <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Booking History</h4>
              {guestBookings(detailGuest).length > 0 ? (
                <div className="space-y-2">
                  {guestBookings(detailGuest).map((b) => (
                    <div key={b.id || b.bookingRef || b._id} className="flex items-center justify-between p-3 bg-surface-2 rounded-lg text-sm">
                      <div>
                        <p className="font-medium text-text-primary">#{b.id} · {b.room.type}</p>
                        <p className="text-xs text-muted">{b.checkIn} → {b.checkOut} · {b.nights} nights</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-text-primary">${b.totalAmount.toLocaleString()}</p>
                        <StatusBadge status={b.status} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted bg-surface-2 rounded-lg p-4 text-center">No bookings found for this guest.</p>
              )}
            </div>

            {/* Additional Adults & Children */}
            {detailAdditional.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Additional Guests</h4>
                <div className="space-y-3">
                  {detailAdditional.map((record: any, idx: number) => (
                    <div key={idx} className="bg-surface-2 rounded-xl p-4 space-y-3">
                      <p className="text-xs text-muted font-semibold">
                        Booking · {record.roomNumber} · {record.checkIn ? new Date(record.checkIn).toLocaleDateString() : "—"}
                      </p>
                      {record.adults?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-text-secondary mb-1.5">Adults ({record.adults.length})</p>
                          <div className="space-y-1.5">
                            {record.adults.map((a: any, i: number) => (
                              <div key={i} className="flex items-center gap-3 bg-white rounded-lg px-3 py-2 border border-border">
                                <div className="w-7 h-7 rounded-full bg-primary-light grid place-items-center shrink-0">
                                  <span className="text-primary text-xs font-bold">{a.name?.charAt(0) || "A"}</span>
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-text-primary">{a.name}</p>
                                  <p className="text-xs text-muted">{a.email || "—"} · {a.phone || "—"}</p>
                                  {a.specialRequests && <p className="text-xs text-muted italic">"{a.specialRequests}"</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {record.children?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-text-secondary mb-1.5">Children ({record.children.length})</p>
                          <div className="flex flex-wrap gap-2">
                            {record.children.map((c: any, i: number) => (
                              <span key={i} className="text-xs bg-warning-light text-warning font-semibold px-3 py-1.5 rounded-full">
                                {c.name} · Age {c.age ?? "—"}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <button onClick={() => { setDetailGuest(null); navigate("/bookings"); }}
              className="w-full py-2.5 border border-border rounded-lg text-sm font-medium text-text-secondary hover:bg-surface-3 transition-colors">
              View All Bookings →
            </button>
          </div>
        )}
      </Modal>

      {/* Register / Edit Guest Modal */}
      <Modal isOpen={registerOpen} onClose={() => { setRegisterOpen(false); setSubmitted(false); }} title={editTarget ? "Edit Guest" : "Register New Guest"}>
        {submitted ? (
          <div className="flex flex-col items-center py-8 gap-3">
            <div className="w-14 h-14 bg-success-light rounded-full grid place-items-center">
              <span className="text-success text-3xl">✓</span>
            </div>
            <p className="font-semibold text-text-primary">{editTarget ? "Guest Updated!" : "Guest Registered!"}</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">Full Name *</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full name"
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm outline-none focus:border-primary" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">Email *</label>
                <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="guest@email.com"
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">Phone</label>
                <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 555 000"
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">City</label>
                <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="New York"
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">Preferred Hotel</label>
                <select value={form.preferredHotel} onChange={(e) => setForm({ ...form, preferredHotel: e.target.value })}
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm outline-none focus:border-primary">
                  <option>The Grand Luxe</option><option>Bon Vivant</option><option>Spa & Pools</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Guest["status"] })}
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm outline-none focus:border-primary">
                  <option>Active</option><option>VIP</option><option>Inactive</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setRegisterOpen(false)}
                className="flex-1 py-2.5 border border-border rounded-lg text-sm font-medium text-text-secondary hover:bg-surface-3 transition-colors">
                Cancel
              </button>
              <button type="submit"
                className="flex-1 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-dark transition-colors">
                {editTarget ? "Update Guest" : "Register Guest"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </AdminLayout>
  );
}
