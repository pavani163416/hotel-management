import { useEffect, useState, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from "recharts";
import {
  DollarSign, TrendingUp, TrendingDown, Download,
  XCircle, RefreshCw, FileText, Package,
} from "lucide-react";
import ManagerLayout from "@/components/ManagerLayout";
import StatusBadge from "@/components/StatusBadge";
import { getManagerBookings } from "@/services/api";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function Financials() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState<"revenue" | "cancellations" | "inventory">("revenue");
  const [period, setPeriod]     = useState<"weekly" | "monthly">("monthly");
  const [refreshing, setRefreshing] = useState(false);

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

  // Revenue by month
  const revenueByMonth = MONTHS.map((month, i) => ({
    month,
    revenue: bookings.filter((b) => new Date(b.checkIn).getMonth() === i)
      .reduce((s: number, b: any) => s + (b.totalAmount || 0), 0),
    bookings: bookings.filter((b) => new Date(b.checkIn).getMonth() === i).length,
  }));

  // Revenue by week (last 8 weeks)
  const revenueByWeek = Array.from({ length: 8 }, (_, i) => {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - (7 - i) * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    return {
      week: `W${i + 1}`,
      revenue: bookings.filter((b) => {
        const d = new Date(b.checkIn);
        return d >= weekStart && d < weekEnd;
      }).reduce((s: number, b: any) => s + (b.totalAmount || 0), 0),
    };
  });

  const chartData = period === "monthly" ? revenueByMonth : revenueByWeek;

  const totalRevenue    = bookings.reduce((s, b) => s + (b.totalAmount || 0), 0);
  const confirmedRev    = bookings.filter((b) => b.status === "Confirmed" || b.status === "Completed")
    .reduce((s, b) => s + (b.totalAmount || 0), 0);
  const cancelledRev    = bookings.filter((b) => b.status === "Cancelled")
    .reduce((s, b) => s + (b.totalAmount || 0), 0);
  const cancellations   = bookings.filter((b) => b.status === "Cancelled");
  const pendingPayments = bookings.filter((b) => b.status === "Pending");

  const exportCSV = () => {
    const rows = [
      ["Month", "Revenue", "Bookings"],
      ...revenueByMonth.map((r) => [r.month, r.revenue, r.bookings]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "revenue-report.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const lowStock = INVENTORY.filter((i) => i.stock < i.min);

  return (
    <ManagerLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Financials & Inventory</h1>
          <p className="text-sm text-muted mt-0.5">Revenue reports, cancellations, and stock tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => load(true)} disabled={refreshing}
            className="flex items-center gap-2 text-sm font-medium text-dim border border-white/10 rounded-xl px-4 py-2 hover:bg-white/5 hover:text-bright transition-all disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button onClick={exportCSV}
            className="btn-imperial flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Revenue",    value: `$${(totalRevenue / 1000).toFixed(1)}k`,    icon: <DollarSign className="w-5 h-5 text-emerald" />,  color: "rgba(16,185,129,0.1)",  trend: "up" },
          { label: "Confirmed Revenue",value: `$${(confirmedRev / 1000).toFixed(1)}k`,   icon: <TrendingUp className="w-5 h-5 text-gold" />,     color: "rgba(212,168,67,0.1)",  trend: "up" },
          { label: "Cancelled Revenue",value: `$${(cancelledRev / 1000).toFixed(1)}k`,   icon: <TrendingDown className="w-5 h-5 text-ruby" />,   color: "rgba(225,29,72,0.1)",   trend: "down" },
          { label: "Pending Payments", value: pendingPayments.length,                     icon: <FileText className="w-5 h-5 text-amber" />,      color: "rgba(245,158,11,0.1)",  trend: "neutral" },
        ].map((item) => (
          <div key={item.label} className="glass-card rounded-2xl p-5 hover:shadow-2xl transition-all">
            <div className={`w-10 h-10 rounded-xl grid place-items-center mb-4`} style={{ background: item.color }}>{item.icon}</div>
            <p className="text-2xl font-bold text-bright">{item.value}</p>
            <p className="text-xs font-semibold uppercase tracking-wider text-dim mt-1.5">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-white/5 mb-6">
        {[
          { id: "revenue",       label: "Revenue Reports",    icon: <DollarSign className="w-4 h-4" /> },
          { id: "cancellations", label: "Cancellation Log",   icon: <XCircle className="w-4 h-4" /> },
          { id: "inventory",     label: "Inventory Tracking", icon: <Package className="w-4 h-4" /> },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${
              activeTab === tab.id
                ? "text-bright border-gold"
                : "text-dim border-transparent hover:text-soft hover:border-white/10"
            }`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Revenue Reports */}
      {activeTab === "revenue" && (
        <div className="space-y-4">
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-bright">Revenue Overview</h3>
              <div className="flex items-center border border-white/10 rounded-xl overflow-hidden bg-white/5">
                <button onClick={() => setPeriod("weekly")}
                  className={`px-4 py-1.5 text-xs font-semibold transition-all ${period === "weekly" ? "bg-primary text-white" : "text-dim hover:text-bright"}`}>
                  Weekly
                </button>
                <button onClick={() => setPeriod("monthly")}
                  className={`px-4 py-1.5 text-xs font-semibold transition-all ${period === "monthly" ? "bg-primary text-white" : "text-dim hover:text-bright"}`}>
                  Monthly
                </button>
              </div>
            </div>
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="w-7 h-7 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={chartData} barSize={period === "monthly" ? 32 : 24}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis dataKey={period === "monthly" ? "month" : "week"}
                    tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip cursor={{ fill: "rgba(255,255,255,0.03)" }}
                    contentStyle={{ background: "#112240", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", fontSize: 12, color: "#f0f4ff" }} />
                  <Bar dataKey="revenue" fill="#d4a843" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Booking count trend */}
          {period === "monthly" && (
            <div className="glass-card rounded-2xl p-6">
              <h3 className="font-semibold text-bright mb-6">Booking Volume</h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={revenueByMonth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#112240", borderRadius: 12, border: "1px solid rgba(255,255,255,0.1)", fontSize: 12, color: "#f0f4ff" }} />
                  <Line type="monotone" dataKey="bookings" stroke="#d4a843" strokeWidth={3} dot={{ fill: "#d4a843", r: 4 }} activeDot={{ r: 6, stroke: "#112240", strokeWidth: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Cancellation Log */}
      {activeTab === "cancellations" && (
        <div className="glass-card rounded-2xl overflow-hidden">
          {cancellations.length === 0 ? (
            <div className="p-16 text-center">
              <XCircle className="w-12 h-12 text-white/5 mx-auto mb-4" />
              <p className="text-sm text-dim">No cancellations recorded</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5 bg-white/5">
                  {["Guest", "Room", "Booking Ref", "Amount", "Check-in", "Cancelled", "Status"].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-dim uppercase tracking-wider px-5 py-4 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cancellations.map((b, i) => (
                  <tr key={i} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-bright">{b.guestSnapshot?.name || "Guest"}</p>
                      <p className="text-xs text-dim">{b.guestSnapshot?.email}</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-soft">{b.room?.type || "—"}</td>
                    <td className="px-5 py-4 text-sm text-dim">{b.bookingRef || b._id?.slice(-8)}</td>
                    <td className="px-5 py-4 text-sm font-bold text-ruby">${(b.totalAmount || 0).toLocaleString()}</td>
                    <td className="px-5 py-4 text-sm text-soft">
                      {b.checkIn ? new Date(b.checkIn).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-5 py-4 text-sm text-soft">
                      {b.updatedAt ? new Date(b.updatedAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-5 py-4"><StatusBadge status="Cancelled" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Inventory */}
      {activeTab === "inventory" && (
        <div className="glass-card rounded-2xl p-16 text-center">
          <Package className="w-12 h-12 text-white/10 mx-auto mb-4" />
          <p className="text-sm font-semibold text-soft">Inventory Tracking</p>
          <p className="text-xs text-dim mt-2 max-w-xs mx-auto">
            Inventory management is not yet connected to the backend. Stock levels will appear here once the inventory API is available.
          </p>
        </div>
      )}
    </ManagerLayout>
  );
}
