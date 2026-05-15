import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
} from "recharts";
import { useNavigate } from "react-router-dom";
import { Download, TrendingUp, Users, DollarSign, BarChart3, ChevronDown } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import Topbar from "@/components/Topbar";
import PageHeader from "@/components/PageHeader";
import StatsCard from "@/components/StatsCard";
import { useBookings } from "@/context/BookingsContext";
import { useHotels } from "@/context/HotelsContext";
import { useState } from "react";

const PIE_COLORS = ["#6366f1", "#a8977a", "#10b981", "#e5e7f0", "#f59e0b", "#e11d48"];

export default function Analytics() {
  const navigate = useNavigate();
  const { bookings } = useBookings();
  const { hotels } = useHotels();
  const [selectedHotel, setSelectedHotel] = useState("All Properties");
  const [showHotelDrop, setShowHotelDrop] = useState(false);

  // Filter bookings by selected hotel
  const filteredBookings = selectedHotel === "All Properties"
    ? bookings
    : bookings.filter((b) => b.property === selectedHotel);

  const totalRevenue = filteredBookings.reduce((s, b) => s + b.totalAmount, 0);
  const confirmed = filteredBookings.filter((b) => b.status === "Confirmed").length;
  const avgSpend = filteredBookings.length ? Math.round(totalRevenue / filteredBookings.length) : 0;

  // ── Revenue by month (actual) ──
  const MONTH_ORDER = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const revenueByMonth: Record<string, number> = {};
  filteredBookings.forEach((b) => {
    const month = new Date(b.createdAt).toLocaleDateString("en-US", { month: "short" });
    revenueByMonth[month] = (revenueByMonth[month] || 0) + b.totalAmount;
  });
  const revenueComparison = MONTH_ORDER
    .filter((m) => revenueByMonth[m] !== undefined)
    .map((m) => ({
      month: m,
      actual: revenueByMonth[m],
      // budget: estimated as 10% above actual for context
      budget: Math.round(revenueByMonth[m] * 1.1),
    }));

  // ── Market share by hotel ──
  const totalAll = bookings.length || 1;
  const hotelCounts: Record<string, number> = {};
  bookings.forEach((b) => {
    const name = b.property || "Other";
    hotelCounts[name] = (hotelCounts[name] || 0) + 1;
  });
  const marketShare = Object.entries(hotelCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([name, count], i) => ({
      name: `${name} (${Math.round((count / totalAll) * 100)}%)`,
      value: Math.round((count / totalAll) * 100),
      color: PIE_COLORS[i % PIE_COLORS.length],
    }));

  // ── Booking trends by month ──
  const bookingsByMonth: Record<string, number> = {};
  bookings.forEach((b) => {
    const month = new Date(b.createdAt).toLocaleDateString("en-US", { month: "short" });
    bookingsByMonth[month] = (bookingsByMonth[month] || 0) + 1;
  });
  const bookingTrends = MONTH_ORDER
    .filter((m) => bookingsByMonth[m] !== undefined)
    .map((m) => ({ month: m, bookings: bookingsByMonth[m] }));

  // ── Occupancy by hotel (confirmed bookings / total bookings) ──
  const occupancy = hotels.slice(0, 3).map((h) => {
    const hTotal = bookings.filter((b) => b.property === h.name).length;
    const hConfirmed = bookings.filter((b) => b.property === h.name && b.status === "Confirmed").length;
    const rate = hTotal > 0 ? Math.round((hConfirmed / hTotal) * 100) : 0;
    return { region: h.name, rate, change: rate > 50 ? `+${rate - 50}%` : `${rate - 50}%` };
  });

  // ── Global presence from hotels ──
  const globalPresence = hotels.slice(0, 4).map((h) => ({
    city: `${h.location || h.name}, ${h.country || ""}`.trim().replace(/,$/, ""),
    flag: h.country === "France" ? "🇫🇷" : h.country === "Japan" ? "🇯🇵" : h.country === "USA" ? "🇺🇸" : h.country === "India" ? "🇮🇳" : "🏨",
  }));

  const handleExportPDF = () => {
    const occupancyRate = bookings.length > 0
      ? `${Math.round(bookings.filter(b => b.status === "Confirmed").length / bookings.length * 100)}%`
      : "0%";
    const rows = [["Metric", "Value"],
      ["Total Revenue", `$${totalRevenue.toLocaleString()}`],
      ["Total Bookings", bookings.length],
      ["Confirmed", confirmed],
      ["Avg Occupancy", occupancyRate],
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "analytics-report.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <Topbar title="Analytics" searchPlaceholder="Hotel Switcher..." />
      <div className="p-6">
        <PageHeader
          title="Group Analytics Overview"
          subtitle={selectedHotel === "All Properties" ? "Real-time performance metrics across all properties." : `Analytics for ${selectedHotel}`}
          actions={
            <>
              {/* Hotel dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowHotelDrop(!showHotelDrop)}
                  className="flex items-center gap-2 text-sm font-medium border border-border rounded-lg px-4 py-2 hover:bg-surface-3 transition-colors bg-white"
                >
                  <BarChart3 className="w-4 h-4 text-muted" />
                  {selectedHotel}
                  <ChevronDown className="w-3.5 h-3.5 text-muted" />
                </button>
                {showHotelDrop && (
                  <div className="absolute right-0 top-10 w-56 bg-white rounded-xl shadow-modal border border-border z-50 overflow-hidden">
                    <button
                      onClick={() => { setSelectedHotel("All Properties"); setShowHotelDrop(false); }}
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-surface-2 transition-colors border-b border-border ${selectedHotel === "All Properties" ? "text-primary font-semibold" : "text-text-primary"}`}
                    >
                      All Properties
                    </button>
                    {hotels.map((h) => (
                      <button
                        key={h.id}
                        onClick={() => { setSelectedHotel(h.name); setShowHotelDrop(false); }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-surface-2 transition-colors border-b border-border last:border-0 ${selectedHotel === h.name ? "text-primary font-semibold" : "text-text-primary"}`}
                      >
                        {h.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button onClick={handleExportPDF}
                className="flex items-center gap-2 text-sm font-medium text-text-secondary border border-border rounded-lg px-4 py-2 hover:bg-surface-3 transition-colors">
                <Download className="w-4 h-4" /> Export Report
              </button>
              <button onClick={() => navigate("/revenue")}
                className="flex items-center gap-2 text-sm font-semibold bg-primary text-white rounded-lg px-4 py-2 hover:bg-primary-dark transition-colors">
                <DollarSign className="w-4 h-4" /> Revenue Details
              </button>
            </>
          }
        />

        {/* Stats — live from context */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => navigate("/revenue")}>
            <StatsCard title="Total Revenue" value={`$${(totalRevenue / 1000).toFixed(0)}k`} change="From all bookings" trend="up"
              icon={<DollarSign className="w-5 h-5 text-primary" />} iconBg="bg-primary-light" />
          </div>
          <StatsCard title="Avg Occupancy" value={hotels.length > 0 ? `${Math.round(bookings.filter(b => b.status === "Confirmed").length / Math.max(bookings.length, 1) * 100)}%` : "0%"} change="Confirmed / total bookings" trend="up"
            icon={<TrendingUp className="w-5 h-5 text-success" />} iconBg="bg-success-light" />
          <div className="cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => navigate("/bookings")}>
            <StatsCard title="Total Bookings" value={filteredBookings.length.toLocaleString()} change={`${confirmed} confirmed`} trend={filteredBookings.length > 0 ? "up" : "neutral"}
              icon={<BarChart3 className="w-5 h-5 text-warning" />} iconBg="bg-warning-light" />
          </div>
          <StatsCard title="Avg Spend" value={avgSpend ? `$${avgSpend.toLocaleString()}` : "$0"} change="Per booking" trend={avgSpend > 0 ? "up" : "neutral"}
            icon={<Users className="w-5 h-5 text-danger" />} iconBg="bg-danger-light" />
        </div>

        {/* Revenue + Market Share */}
        <div className="grid lg:grid-cols-[1fr_280px] gap-4 mb-4">
          <div className="bg-white rounded-xl border border-border p-5 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-text-primary">Revenue by Month</h3>
                <p className="text-xs text-muted mt-0.5">Actual revenue vs estimated budget</p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-primary inline-block" />Actual</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-surface-3 inline-block" />Budget</span>
              </div>
            </div>
            {revenueComparison.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={revenueComparison} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => [`$${(v / 1000).toFixed(0)}k`]}
                    contentStyle={{ borderRadius: 8, border: "1px solid #e5e7f0", fontSize: 12 }} />
                  <Bar dataKey="actual" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="budget" fill="#e5e7f0" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted text-sm">No booking data yet</div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-border p-5 shadow-card">
            <h3 className="font-semibold text-text-primary mb-1">Market Share</h3>
            <p className="text-xs text-muted mb-3">Bookings distribution by hotel</p>
            {marketShare.length > 0 ? (
              <>
                <div className="flex justify-center">
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={marketShare} cx="50%" cy="50%" innerRadius={45} outerRadius={65}
                        dataKey="value" strokeWidth={0}>
                        {marketShare.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1.5 mt-1">
                  {marketShare.map((item) => (
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
              <div className="h-[200px] flex items-center justify-center text-muted text-sm">No bookings yet</div>
            )}
          </div>
        </div>

        {/* Booking Trends */}
        <div className="bg-white rounded-xl border border-border p-5 shadow-card mb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-text-primary">Booking Trends</h3>
              <p className="text-xs text-muted mt-0.5">Monthly booking volume across all properties</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="text-xs font-semibold text-primary border-b-2 border-primary pb-0.5">Volume</button>
              <button onClick={() => navigate("/revenue")} className="text-xs text-muted hover:text-text-primary">Revenue →</button>
            </div>
          </div>
          {bookingTrends.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={bookingTrends}>
                <defs>
                  <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e5e7f0", fontSize: 12 }} />
                <Area type="monotone" dataKey="bookings" stroke="#6366f1" strokeWidth={2.5}
                  fill="url(#trendGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-muted text-sm">No booking data yet</div>
          )}
        </div>

        {/* Occupancy + Global Presence */}
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-border p-5 shadow-card">
            <h3 className="font-semibold text-text-primary mb-4">Occupancy by Hotel</h3>
            {occupancy.length > 0 ? (
              <div className="space-y-4">
                {occupancy.map((o) => (
                  <div key={o.region}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-text-secondary truncate max-w-[160px]">{o.region}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-text-primary">{o.rate}%</span>
                        <span className={`text-xs font-semibold ${o.change.startsWith("+") ? "text-success" : "text-danger"}`}>
                          {o.change}
                        </span>
                      </div>
                    </div>
                    <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${o.rate}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted text-center py-4">No hotel data yet</p>
            )}
          </div>

          <div className="bg-gradient-to-br from-[#1a1f2e] to-[#2d3748] rounded-xl p-5 text-white">
            <h3 className="font-semibold text-sm mb-1">Global Presence</h3>
            <p className="text-white/50 text-xs mb-4">Live booking activity worldwide</p>
            {/* Demo map via OpenStreetMap */}
            <div className="rounded-lg overflow-hidden mb-4" style={{ height: 160 }}>
              <iframe
                title="Global Presence Map"
                width="100%"
                height="100%"
                style={{ border: 0, filter: "invert(90%) hue-rotate(180deg)" }}
                src="https://www.openstreetmap.org/export/embed.html?bbox=-180,-85,180,85&layer=mapnik"
                loading="lazy"
              />
            </div>
            <div className="flex gap-3 flex-wrap">
              {globalPresence.length > 0 ? globalPresence.map((p) => (
                <div key={p.city} className="flex-1 bg-white/10 rounded-lg px-3 py-2 min-w-[80px]">
                  <p className="text-lg">{p.flag}</p>
                  <p className="text-white text-xs font-semibold mt-1 truncate">{p.city}</p>
                </div>
              )) : (
                <p className="text-white/50 text-xs">No hotel locations available</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
