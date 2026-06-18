import { useState, useEffect } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell,
} from "recharts";
import { DollarSign, TrendingUp, TrendingDown, CreditCard, Download, Building2, ChevronDown, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "@/components/AdminLayout";
import Topbar from "@/components/Topbar";
import PageHeader from "@/components/PageHeader";
import StatsCard from "@/components/StatsCard";
import { useBookings } from "@/context/BookingsContext";
import { useHotels } from "@/context/HotelsContext";
import { formatCurrency } from "@/utils/currency";

const revenueBySource = [
  { name: "Room Bookings", value: 62, color: "#6366f1" },
  { name: "F&B Services", value: 18, color: "#10b981" },
  { name: "Spa & Wellness", value: 12, color: "#f59e0b" },
  { name: "Events", value: 8, color: "#a8977a" },
];

export default function Revenue() {
  const navigate = useNavigate();
  const { bookings } = useBookings();
  const { hotels } = useHotels();
  const [selectedHotelId, setSelectedHotelId] = useState<string>("all");

  // Filter bookings by selected hotel
  const hotelBookings = selectedHotelId === "all"
    ? bookings
    : bookings.filter((b) => {
        // Match by property name or by hotel ID in room number
        if (b.property === hotels.find((h) => h.hotelId === selectedHotelId)?.name) return true;
        const roomNum = b.room?.roomNumber || "";
        const prefix = roomNum.split("-")[0]?.toLowerCase();
        const initials = hotels.find((h) => h.hotelId === selectedHotelId)?.name
          .replace(/[^a-zA-Z\s]/g, "")
          .split(/\s+/).filter(Boolean)
          .map((w: string) => w[0].toLowerCase()).join("");
        return prefix === initials || roomNum.startsWith(`${selectedHotelId}_`);
      });

  const totalRevenue = hotelBookings.reduce((s, b) => s + b.totalAmount, 0);
  const netProfit = totalRevenue * 0.76;
  const avgPerBooking = hotelBookings.length ? Math.round(totalRevenue / hotelBookings.length) : 0;

  const selectedHotelName = selectedHotelId === "all"
    ? "All Hotels"
    : hotels.find((h) => h.hotelId === selectedHotelId)?.name || selectedHotelId;

  const selectedCurrency = selectedHotelId === "all"
    ? "USD"
    : hotels.find((h) => h.hotelId === selectedHotelId)?.currency ?? "USD";

  // Group bookings by month for chart
  const monthlyData: Record<string, { revenue: number; expenses: number; bookings: number }> = {};
  hotelBookings.forEach((b) => {
    const month = new Date(b.createdAt).toLocaleDateString("en-US", { month: "short" });
    if (!monthlyData[month]) monthlyData[month] = { revenue: 0, expenses: 0, bookings: 0 };
    monthlyData[month].revenue += b.totalAmount;
    monthlyData[month].expenses += Math.round(b.totalAmount * 0.24);
    monthlyData[month].bookings += 1;
  });

  const monthlyRevenue = Object.entries(monthlyData).map(([month, data]) => ({
    month,
    revenue: data.revenue,
    expenses: data.expenses,
    bookings: data.bookings,
  }));

  // Avg spend per month
  const avgSpendData = monthlyRevenue.map((m) => ({
    month: m.month,
    avg: m.bookings ? Math.round(m.revenue / m.bookings) : 0,
  }));

  // Top properties by revenue (only if "All Hotels" selected)
  const topProperties = selectedHotelId === "all"
    ? hotels.map((h) => {
        const hBookings = bookings.filter((b) => {
          if (b.property === h.name) return true;
          const roomNum = b.room?.roomNumber || "";
          const prefix = roomNum.split("-")[0]?.toLowerCase();
          const initials = h.name.replace(/[^a-zA-Z\s]/g, "").split(/\s+/).filter(Boolean).map((w: string) => w[0].toLowerCase()).join("");
          return prefix === initials || roomNum.startsWith(`${h.hotelId}_`);
        });
        const revenue = hBookings.reduce((s, b) => s + b.totalAmount, 0);
        return { name: h.name, revenue, bookings: hBookings.length };
      }).sort((a, b) => b.revenue - a.revenue).slice(0, 5)
    : [];

  const maxRevenue = Math.max(...topProperties.map((h) => h.revenue), 1);

  const handleExport = () => {
    const rows = [
      ["Month", "Revenue", "Expenses", "Bookings", "Avg Spend"],
      ...monthlyRevenue.map((m) => [m.month, m.revenue, m.expenses, m.bookings, m.bookings ? Math.round(m.revenue / m.bookings) : 0]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `revenue-${selectedHotelId}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <Topbar title="Revenue" />
      <div className="p-6">
        <PageHeader
          title="Revenue Overview"
          subtitle="Financial performance and average spend analytics."
          actions={
            <>
              <button onClick={() => navigate("/bookings")}
                className="flex items-center gap-2 text-sm font-medium text-text-secondary border border-border rounded-lg px-4 py-2 hover:bg-surface-3 transition-colors">
                View Bookings
              </button>
              <button onClick={handleExport}
                className="flex items-center gap-2 text-sm font-medium text-text-secondary border border-border rounded-lg px-4 py-2 hover:bg-surface-3 transition-colors">
                <Download className="w-4 h-4" /> Export Report
              </button>
            </>
          }
        />

        {/* Hotel Selector */}
        <div className="bg-white rounded-xl border border-border shadow-card p-4 mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm font-semibold text-text-secondary">
              <Building2 className="w-4 h-4 text-primary" />
              Select Hotel
            </div>
            <div className="relative">
              <select
                value={selectedHotelId}
                onChange={(e) => setSelectedHotelId(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2.5 border border-border rounded-lg text-sm font-medium text-text-primary outline-none focus:border-primary bg-white min-w-[220px] cursor-pointer"
              >
                <option value="all">All Hotels</option>
                {hotels.map((h) => (
                  <option key={h.hotelId} value={h.hotelId}>{h.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
            </div>
            {selectedHotelId !== "all" && (
              <div className="flex items-center gap-2 ml-2 px-3 py-1.5 bg-primary-light rounded-full">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-xs font-semibold text-primary">{selectedHotelName}</span>
                <button onClick={() => setSelectedHotelId("all")} className="text-primary hover:text-primary-dark ml-1">
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
            <span className="ml-auto text-xs text-muted">
              {hotelBookings.length} booking{hotelBookings.length !== 1 ? "s" : ""} · {formatCurrency(totalRevenue, selectedCurrency)} revenue
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatsCard title="Total Revenue" value={formatCurrency(totalRevenue, selectedCurrency, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} change={`${hotelBookings.length} bookings`} trend="up"
            icon={<DollarSign className="w-5 h-5 text-primary" />} iconBg="bg-primary-light" />
          <StatsCard title="Avg/Booking" value={formatCurrency(avgPerBooking, selectedCurrency)} change="Per reservation" trend="up"
            icon={<TrendingUp className="w-5 h-5 text-success" />} iconBg="bg-success-light" />
          <StatsCard title="Total Expenses" value={formatCurrency((totalRevenue * 0.24), selectedCurrency, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} change="~24% of revenue" trend="neutral"
            icon={<TrendingDown className="w-5 h-5 text-danger" />} iconBg="bg-danger-light" />
          <StatsCard title="Net Profit" value={formatCurrency(netProfit, selectedCurrency, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} change="~76% of revenue" trend="up"
            icon={<CreditCard className="w-5 h-5 text-warning" />} iconBg="bg-warning-light" />
        </div>

        {/* Revenue vs Expenses chart */}
        {monthlyRevenue.length > 0 ? (
          <div className="bg-white rounded-xl border border-border p-5 shadow-card mb-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-text-primary">Revenue vs Expenses</h3>
                <p className="text-xs text-muted mt-0.5">Monthly financial performance for {selectedHotelName}</p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-primary inline-block" />Revenue</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-danger inline-block" />Expenses</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyRevenue} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => formatCurrency(v, selectedCurrency, { minimumFractionDigits: 0, maximumFractionDigits: 0 }).replace(/\s+/g, "")} />
                <Tooltip formatter={(v: any) => [formatCurrency(v, selectedCurrency, { minimumFractionDigits: 0, maximumFractionDigits: 0 }), "Revenue"]}
                  contentStyle={{ borderRadius: 8, border: "1px solid #e5e7f0", fontSize: 12 }} />
                <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="expenses" fill="#f87171" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-border p-12 shadow-card mb-4 text-center text-muted">
            No bookings found for {selectedHotelName}.
          </div>
        )}

        {/* Avg Spend + Revenue by Source */}
        <div className="grid lg:grid-cols-[1fr_300px] gap-4 mb-4">
          {/* Avg Spend per Guest */}
          {avgSpendData.length > 0 && (
            <div className="bg-white rounded-xl border border-border p-5 shadow-card">
              <div className="mb-4">
                <h3 className="font-semibold text-text-primary">Avg Spend per Booking</h3>
                <p className="text-xs text-muted mt-0.5">Average guest expenditure trend over time</p>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={avgSpendData}>
                  <defs>
                    <linearGradient id="avgGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => formatCurrency(v, selectedCurrency, { minimumFractionDigits: 0, maximumFractionDigits: 0 }).replace(/\s+/g, "")} />
                  <Tooltip formatter={(v: any) => [formatCurrency(v, selectedCurrency, { minimumFractionDigits: 0, maximumFractionDigits: 0 }), "Avg Spend"]}
                    contentStyle={{ borderRadius: 8, border: "1px solid #e5e7f0", fontSize: 12 }} />
                  <Area type="monotone" dataKey="avg" stroke="#10b981" strokeWidth={2.5}
                    fill="url(#avgGrad)" dot={{ fill: "#10b981", r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Revenue by Source */}
          <div className="bg-white rounded-xl border border-border p-5 shadow-card">
            <h3 className="font-semibold text-text-primary mb-1">Revenue by Source</h3>
            <p className="text-xs text-muted mb-3">Breakdown of income streams</p>
            <div className="flex justify-center">
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={revenueBySource} cx="50%" cy="50%" innerRadius={45} outerRadius={65}
                    dataKey="value" strokeWidth={0}>
                    {revenueBySource.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5 mt-1">
              {revenueBySource.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: item.color }} />
                    <span className="text-muted">{item.name}</span>
                  </div>
                  <span className="font-semibold text-text-primary">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Properties by Revenue — only show when "All Hotels" selected */}
        {selectedHotelId === "all" && topProperties.length > 0 && (
          <div className="bg-white rounded-xl border border-border p-5 shadow-card">
            <h3 className="font-semibold text-text-primary mb-4">Top Properties by Revenue</h3>
            <div className="space-y-4">
              {topProperties.map((h) => (
                <div key={h.name}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-text-primary font-medium">{h.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted">{h.bookings} bookings</span>
                      <span className="text-text-secondary font-semibold">{formatCurrency(h.revenue, selectedCurrency, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).replace(/\s+/g, "")}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(h.revenue / maxRevenue) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
