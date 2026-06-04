import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";
import { Hotel, Users, DollarSign, CalendarCheck, Download, Plus, MoreVertical } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import Topbar from "@/components/Topbar";
import StatsCard from "@/components/StatsCard";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import Modal from "@/components/Modal";
import { useBookings } from "@/context/BookingsContext";
import { useHotels } from "@/context/HotelsContext";
import { useAdmin } from "@/context/AdminContext";
import { getStats, getAdminPriceRequests, createBooking } from "@/services/api";

const PIE_COLORS = ["#6366f1", "#a8977a", "#10b981", "#f59e0b", "#e11d48", "#0ea5e9"];

export default function Dashboard() {
  const navigate = useNavigate();
  const { t } = useAdmin();
  const { bookings, refetch, loading } = useBookings();
  const { hotels } = useHotels();

  const showQuickStats = localStorage.getItem("luxe_pref_show_quick_stats") !== "false";
  const showRevenueGraphs = localStorage.getItem("luxe_pref_show_revenue_graphs") !== "false";
  const [stats, setStats] = useState<any>(null);
  const [priceRequests, setPriceRequests] = useState<any[]>([]);
  const [showNewBooking, setShowNewBooking] = useState(false);
  const [actionBooking, setActionBooking] = useState<any>(null);
  const [nbSubmitted, setNbSubmitted] = useState(false);
  const [nbSaving, setNbSaving] = useState(false);
  const [nbError, setNbError] = useState("");

  // form fields
  const [nbGuest, setNbGuest] = useState("");
  const [nbEmail, setNbEmail] = useState("");
  const [nbAadhaar, setNbAadhaar] = useState("");
  const [nbProperty, setNbProperty] = useState("");
  const [nbRoom, setNbRoom] = useState("Deluxe");
  const [nbCheckIn, setNbCheckIn] = useState("");
  const [nbCheckOut, setNbCheckOut] = useState("");
  const [nbAmount, setNbAmount] = useState("");
  const [nbPricePerNight, setNbPricePerNight] = useState("");

  useEffect(() => {
    getStats()
      .then((r: any) => setStats(r?.data))
      .catch(() => {
        // Backend unreachable — derive from loaded bookings (may still be loading)
        setStats(null);
      });

    getAdminPriceRequests({ status: "pending" })
      .then((res: any) => setPriceRequests(res?.data?.slice(0, 5) || []))
      .catch(() => setPriceRequests([]));
  }, []);

  // ── Compute live revenue chart data from bookings ──
  const revenueData = (() => {
    const monthMap: Record<string, number> = {};
    bookings.forEach((b) => {
      const month = new Date(b.createdAt).toLocaleDateString("en-US", { month: "short" });
      monthMap[month] = (monthMap[month] || 0) + b.totalAmount;
    });
    const ORDER = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return ORDER.filter((m) => monthMap[m] !== undefined).map((m) => ({ month: m, revenue: monthMap[m] }));
  })();

  // ── Compute live booking share by hotel ──
  const bookingShare = (() => {
    const total = bookings.length || 1;
    const hotelCounts: Record<string, number> = {};
    bookings.forEach((b) => {
      const name = b.property || "Other";
      hotelCounts[name] = (hotelCounts[name] || 0) + 1;
    });
    return Object.entries(hotelCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count], i) => ({
        name,
        value: Math.round((count / total) * 100),
        color: PIE_COLORS[i % PIE_COLORS.length],
      }));
  })();

  // ── Compute top hotels by revenue ──
  const topHotels = (() => {
    const hotelRevenue: Record<string, number> = {};
    bookings.forEach((b) => {
      const name = b.property || "Other";
      hotelRevenue[name] = (hotelRevenue[name] || 0) + b.totalAmount;
    });
    const sorted = Object.entries(hotelRevenue).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const max = sorted[0]?.[1] || 1;
    return sorted.map(([name, revenue]) => ({ name, revenue, pct: Math.round((revenue / max) * 100) }));
  })();

  const recentBookings = bookings.slice(0, 5);

  const handleExport = () => {
    const rows = [
      ["Guest", "Email", "Property", "Room Type", "Check-in", "Check-out", "Amount", "Status"],
      ...bookings.map((b) => [
        b.guestSnapshot.name, b.guestSnapshot.email,
        b.property, b.room.type,
        b.checkIn, b.checkOut,
        `$${b.totalAmount.toLocaleString()}`, b.status,
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "bookings-export.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleNewBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNbError("");
    setNbSaving(true);
    const checkInDate = new Date(nbCheckIn);
    const checkOutDate = new Date(nbCheckOut);
    const nights = Math.max(1, Math.round((checkOutDate.getTime() - checkInDate.getTime()) / 86400000));
    const selectedHotel = hotels.find(h => h.name === nbProperty);
    // Derive pricePerNight from total if not explicitly provided
    const resolvedPPN = parseFloat(nbPricePerNight) || Math.round((parseFloat(nbAmount) || 0) / nights) || 100;
    try {
      await createBooking({
        roomId: nbRoom,          // room type used as identifier; backend resolves to physical room
        roomTypeId: nbRoom,
        hotelName: nbProperty,
        hotelId: selectedHotel?.hotelId,
        guest: {
          name: nbGuest,
          email: nbEmail,
          id: nbAadhaar,
        },
        checkIn: nbCheckIn,
        checkOut: nbCheckOut,
        totalAmount: parseFloat(nbAmount) || 0,
        subtotal: parseFloat(nbAmount) || 0,
        pricePerNight: resolvedPPN,
        paymentMethod: "card",
      });
      refetch(); // refresh bookings list from backend
      setNbSubmitted(true);
      setTimeout(() => {
        setShowNewBooking(false);
        setNbSubmitted(false);
        setNbGuest(""); setNbEmail(""); setNbAadhaar("");
        setNbProperty(hotels[0]?.name || "");
        setNbRoom("Deluxe"); setNbCheckIn(""); setNbCheckOut("");
        setNbAmount(""); setNbPricePerNight(""); setNbError("");
        navigate("/bookings");
      }, 1200);
    } catch (err: any) {
      setNbError(err.message || "Failed to create booking. Please try again.");
    } finally {
      setNbSaving(false);
    }
  };

  return (
    <AdminLayout>
      <Topbar title="Dashboard" />
      <div className="p-6">
        <PageHeader
          title="Global Operations"
          subtitle={`${t("Real-time performance across")} ${stats?.totalHotels ?? hotels.length} ${t("luxury properties")}`}
          actions={
            <>
              <button onClick={handleExport}
                className="flex items-center gap-2 text-sm font-medium text-text-secondary border border-border rounded-lg px-4 py-2 hover:bg-surface-3 transition-colors">
                <Download className="w-4 h-4" /> {t("Export Report")}
              </button>
              <button onClick={() => setShowNewBooking(true)}
                className="flex items-center gap-2 text-sm font-semibold bg-primary text-white rounded-lg px-4 py-2 hover:bg-primary-dark transition-colors">
                <Plus className="w-4 h-4" /> {t("New Booking")}
              </button>
            </>
          }
        />

        {/* Stats — all clickable */}
        {showQuickStats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => navigate("/hotels")}>
              <StatsCard title={t("Total Hotels")} value={hotels.length > 0 ? hotels.length : "—"} change={hotels.length > 0 ? `${hotels.length} ${t("properties")}` : t("Loading...")} trend="up"
                icon={<Hotel className="w-5 h-5 text-primary" />} iconBg="bg-primary-light" />
            </div>
            <div className="cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => navigate("/bookings")}>
              <StatsCard title={t("Total Bookings")} value={loading ? "—" : bookings.length.toLocaleString()} change={loading ? t("Loading...") : `${bookings.filter(b => b.status === "Confirmed").length} ${t("confirmed")}`} trend="up"
                icon={<CalendarCheck className="w-5 h-5 text-warning" />} iconBg="bg-warning-light" />
            </div>
            <div className="cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => navigate("/revenue")}>
              <StatsCard title={t("Total Revenue")}
                value={loading ? "—" : `$${((bookings.reduce((s, b) => s + b.totalAmount, 0)) / 1000).toFixed(1)}k`}
                change={loading ? t("Loading...") : `${bookings.length} ${t("bookings")}`} trend="up"
                icon={<DollarSign className="w-5 h-5 text-success" />} iconBg="bg-success-light" />
            </div>
            <div className="cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => navigate("/guests")}>
              <StatsCard title={t("Total Guests")} value={loading ? "—" : (stats?.totalGuests ?? bookings.length).toLocaleString()} change={loading ? t("Loading...") : t("Registered guests")} trend="neutral"
                icon={<Users className="w-5 h-5 text-text-secondary" />} iconBg="bg-surface-3" />
            </div>
          </div>
        )}

        {/* Charts */}
        {showRevenueGraphs && (
          <div className="grid lg:grid-cols-[1fr_320px] gap-4 mb-6">
            <div className="bg-white rounded-xl border border-border p-5 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-text-primary">{t("Revenue Analytics")}</h3>
                <select className="text-xs border border-border rounded-lg px-2 py-1 outline-none text-muted">
                  <option>{t("Last 6 Months")}</option><option>{t("Last 12 Months")}</option>
                </select>
              </div>
              {revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => [`$${(v / 1000).toFixed(0)}k`, t("Revenue")]}
                    contentStyle={{ borderRadius: 8, border: "1px solid #e5e7f0", fontSize: 12 }} />
                  <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2}
                    fill="url(#revGrad)" dot={{ fill: "#6366f1", r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted text-sm">{t("No booking data yet")}</div>
              )}
            </div>

            <div className="bg-white rounded-xl border border-border p-5 shadow-card">
              <h3 className="font-semibold text-text-primary mb-4">{t("Booking Share")}</h3>
              {bookingShare.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={bookingShare} cx="50%" cy="50%" innerRadius={50} outerRadius={70} dataKey="value" strokeWidth={0}>
                        {bookingShare.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 w-full mt-2">
                    {bookingShare.map((item) => (
                      <div key={item.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.color }} />
                          <span className="text-muted truncate max-w-[140px]">{item.name}</span>
                        </div>
                        <span className="font-semibold text-text-primary">{item.value}%</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted text-sm">{t("No bookings yet")}</div>
              )}
            </div>
          </div>
        )}

        {/* Top Hotels */}
        <div className="bg-white rounded-xl border border-border p-5 shadow-card mb-6">
          <h3 className="font-semibold text-text-primary mb-4">{t("Top Performing Hotels by Revenue")}</h3>
          {topHotels.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
              {topHotels.map((h) => (
                <div key={h.name}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-text-primary font-medium truncate">{h.name}</span>
                    <span className="text-text-secondary font-semibold shrink-0 ml-2">${(h.revenue / 1000).toFixed(1)}k</span>
                  </div>
                  <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${h.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted text-center py-4">{t("No revenue data yet")}</p>
          )}
        </div>

        {/* Recent Bookings */}
        <div className="bg-white rounded-xl border border-border shadow-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="font-semibold text-text-primary">{t("Global Recent Bookings")}</h3>
            <button onClick={() => navigate("/bookings")}
              className="text-xs text-primary font-semibold hover:underline">
              {t("View All")}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {[t("Guest"), t("Property"), t("Room Type"), t("Amount"), t("Status"), t("Action")].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-muted uppercase tracking-wider px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentBookings.map((b, i) => (
                  <tr key={i} className="border-b border-border last:border-0 hover:bg-surface-2 transition-colors">
                    <td className="px-5 py-3.5">
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
                    <td className="px-5 py-3.5 text-sm text-text-secondary">{b.property}</td>
                    <td className="px-5 py-3.5 text-sm text-text-secondary">{b.room.type}</td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-text-primary">${b.totalAmount.toLocaleString()}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={b.status} /></td>
                    <td className="px-5 py-3.5">
                      <button onClick={() => setActionBooking(b)}
                        className="text-muted hover:text-text-primary transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Price Requests */}
        <div className="bg-white rounded-xl border border-border shadow-card mt-6">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <h3 className="font-semibold text-text-primary">{t("Global Recent Price Requests")}</h3>
            <button onClick={() => navigate("/price-requests")}
              className="text-xs text-primary font-semibold hover:underline">
              {t("View All")}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {[t("Room"), t("Hotel"), t("Requested By"), t("Current"), t("Requested"), t("Status")].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-muted uppercase tracking-wider px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {priceRequests.length > 0 ? priceRequests.map((req, i) => (
                  <tr key={i} className="border-b border-border last:border-0 hover:bg-surface-2 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-semibold text-text-primary">#{req.roomNumber}</p>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-text-secondary">{req.hotelName || "—"}</td>
                    <td className="px-5 py-3.5 text-sm text-text-secondary">{req.createdByName || req.createdBy?.name || "—"}</td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-text-primary">${req.currentPrice.toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-sm font-bold text-text-primary">${req.requestedPrice.toLocaleString()}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${
                        req.status === "pending" ? "bg-warning-light text-warning" : 
                        req.status === "approved" ? "bg-success-light text-success" : 
                        "bg-danger-light text-danger"
                      }`}>
                        {req.status}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="px-5 py-6 text-center text-muted text-sm">
                      {t("No pending price requests.")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── New Booking Modal ── */}
      <Modal isOpen={showNewBooking} onClose={() => { setShowNewBooking(false); setNbSubmitted(false); }} title={t("New Booking")}>
        {nbSubmitted ? (
          <div className="flex flex-col items-center py-8 gap-3">
            <div className="w-14 h-14 bg-success-light rounded-full grid place-items-center">
              <span className="text-success text-3xl">✓</span>
            </div>
            <p className="font-semibold text-text-primary text-lg">{t("Booking Created!")}</p>
            <p className="text-sm text-muted">{t("Redirecting to bookings page...")}</p>
          </div>
        ) : (
          <form onSubmit={handleNewBookingSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">{t("Guest Name *")}</label>
                <input required value={nbGuest} onChange={(e) => setNbGuest(e.target.value)}
                  placeholder="Full name" minLength={2}
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">{t("Email *")}</label>
                <input required type="email" value={nbEmail} onChange={(e) => setNbEmail(e.target.value)}
                  placeholder="guest@email.com"
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">{t("Aadhaar Number *")} <span className="text-muted normal-case font-normal">(12 digits)</span></label>
                <input required value={nbAadhaar} onChange={(e) => setNbAadhaar(e.target.value.replace(/\D/g, "").slice(0, 12))}
                  placeholder="12-digit Aadhaar" pattern="[0-9]{12}" maxLength={12}
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">{t("Property *")}</label>
                <select required value={nbProperty} onChange={(e) => setNbProperty(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary">
                  {hotels.length > 0
                    ? hotels.map((h) => <option key={h.id || h.hotelId} value={h.name}>{h.name}</option>)
                    : <option value="">No hotels available</option>
                  }
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">{t("Room Type *")}</label>
                <select value={nbRoom} onChange={(e) => setNbRoom(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary">
                  <option>Deluxe</option>
                  <option>Suite</option>
                  <option>Standard</option>
                  <option>Penthouse</option>
                  <option>Executive Suite</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">{t("Check-in *")}</label>
                <input required type="date" value={nbCheckIn} onChange={(e) => setNbCheckIn(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">{t("Check-out *")}</label>
                <input required type="date" value={nbCheckOut} onChange={(e) => setNbCheckOut(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">{t("Price / Night ($) *")}</label>
                <input required type="number" min="1" value={nbPricePerNight} onChange={(e) => setNbPricePerNight(e.target.value)}
                  placeholder="e.g. 200"
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">{t("Total Amount ($) *")}</label>
                <input required type="number" min="0" value={nbAmount} onChange={(e) => setNbAmount(e.target.value)}
                  placeholder="e.g. 1200"
                  className="w-full border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
              </div>
            </div>
            {nbError && (
              <div className="text-xs text-danger bg-danger-light border border-danger/20 rounded-lg px-3 py-2">
                {nbError}
              </div>
            )}
            <button type="submit" disabled={nbSaving}
              className="w-full bg-primary text-white py-3 rounded-xl font-semibold text-sm hover:bg-primary-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
              {nbSaving ? t("Creating Booking...") : t("Create Booking")}
            </button>
          </form>
        )}
      </Modal>

      {/* ── Three-dots Action Modal ── */}
      <Modal isOpen={!!actionBooking} onClose={() => setActionBooking(null)} title="Booking Actions">
        {actionBooking && (
          <div className="space-y-3">
            <div className="bg-surface-2 rounded-lg p-4 text-sm space-y-1">
              <p className="font-semibold text-text-primary text-base">{actionBooking.guestSnapshot.name}</p>
              <p className="text-xs text-muted">{actionBooking.guestSnapshot.email}</p>
              <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border">
                <span className="text-xs text-text-secondary">{actionBooking.room.type}</span>
                <span className="text-xs text-muted">·</span>
                <span className="text-xs font-semibold text-text-primary">${actionBooking.totalAmount.toLocaleString()}</span>
                <span className="text-xs text-muted">·</span>
                <StatusBadge status={actionBooking.status} />
              </div>
            </div>
            <button onClick={() => { setActionBooking(null); navigate("/bookings"); }}
              className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium text-text-primary hover:bg-surface-2 transition-colors border border-border flex items-center justify-between">
              View Full Details <span className="text-muted">→</span>
            </button>
            <button onClick={() => { setActionBooking(null); navigate("/bookings"); }}
              className="w-full text-left px-4 py-3 rounded-lg text-sm font-medium text-text-primary hover:bg-surface-2 transition-colors border border-border flex items-center justify-between">
              Go to All Bookings <span className="text-muted">→</span>
            </button>
          </div>
        )}
      </Modal>
    </AdminLayout>
  );
}
