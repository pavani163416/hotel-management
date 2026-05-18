import { useEffect, useState, useCallback } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  CalendarCheck, DollarSign, LogIn, LogOut,
  AlertTriangle, Bell, RefreshCw, ArrowRight,
  Star, Wrench, CheckCircle2, Clock,
} from "lucide-react";
import ManagerLayout from "@/components/ManagerLayout";
import StatusBadge from "@/components/StatusBadge";
import { getManagerStats, getManagerBookings, getManagerRooms } from "@/services/api";
import { useSocket } from "@/hooks/useSocket";
import { useNavigate } from "react-router-dom";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// Circular occupancy ring
function OccupancyRing({ pct }: { pct: number }) {
  const r = 52, circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width="128" height="128" className="rotate-[-90deg]">
      <circle cx="64" cy="64" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
      <circle cx="64" cy="64" r={r} fill="none" stroke="#c0392b" strokeWidth="10"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.8s ease", filter: "drop-shadow(0 0 6px rgba(192,57,43,0.5))" }} />
    </svg>
  );
}

// Glass stat card
function GlassCard({ icon, label, value, sub, onClick }: {
  icon: React.ReactNode; label: string; value: string | number;
  sub?: string; onClick?: () => void;
}) {
  return (
    <button onClick={onClick}
      className="group relative rounded-2xl p-5 text-left w-full transition-all"
      style={{
        background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.background = "linear-gradient(135deg, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0.04) 100%)";
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.13)";
        (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
        (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 32px rgba(0,0,0,0.3)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.background = "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)";
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)";
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLElement).style.boxShadow = "none";
      }}
    >
      <div className="mb-3">{icon}</div>
      <p className="text-2xl font-bold text-bright">{value}</p>
      <p className="text-sm font-medium text-soft mt-0.5">{label}</p>
      {sub && <p className="text-xs text-dim mt-1">{sub}</p>}
    </button>
  );
}

const ALERTS_KEY = "luxe_manager_alerts";

function loadAlerts() {
  try {
    const raw = localStorage.getItem(ALERTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return []; // start empty — no demo/fake alerts
}

function saveAlerts(alerts: { id: string; type: string; msg: string; time: string; priority: string }[]) {
  try { localStorage.setItem(ALERTS_KEY, JSON.stringify(alerts)); } catch {}
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats]       = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [rooms, setRooms]       = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alerts, setAlerts] = useState(() => loadAlerts());
  const [alertDetail, setAlertDetail] = useState<any | null>(null);

  const updateAlerts = (next: any[]) => {
    setAlerts(next);
    saveAlerts(next);
  };

  const load = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const [sR, bR, rR]: any[] = await Promise.allSettled([getManagerStats(), getManagerBookings(), getManagerRooms()]);
      if (sR.status === "fulfilled") setStats(sR.value?.data);
      if (bR.status === "fulfilled") setBookings(bR.value?.data || []);
      if (rR.status === "fulfilled") setRooms(rR.value?.data || []);
    } catch { /* use whatever loaded */ }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useSocket("newBooking", useCallback((data: any) => {
    load();
    setAlerts((prev) => {
      const next = [
        { id: Date.now().toString(), type: "booking", msg: `New booking: ${data.guestName || "Guest"}`, time: "just now", priority: "medium" },
        ...prev.slice(0, 5),
      ];
      saveAlerts(next);
      return next;
    });
  }, [load]));

  // ── Listen for notifications via custom DOM event from ManagerLayout ──
  // ManagerLayout owns the socket room registration and dispatches luxe:notification
  useEffect(() => {
    const handler = (e: Event) => {
      const data = (e as CustomEvent).detail;
      if (!data?.message) return;
      const typeMap: Record<string, string> = {
        manager:    "vip",
        booking:    "booking",
        system:     "maintenance",
        assistance: "housekeeping",
        price:      "payment",
      };
      const priority = data.type === "manager" ? "high" : "medium";
      setAlerts((prev: any[]) => {
        const next = [
          {
            id:       data._id || Date.now().toString(),
            type:     typeMap[data.type] || "booking",
            msg:      data.message,
            time:     "just now",
            priority,
            fullData: data,
          },
          ...prev.filter((a: any) => a.id !== data._id).slice(0, 7),
        ];
        saveAlerts(next);
        return next;
      });
    };
    window.addEventListener("luxe:notification", handler);
    return () => window.removeEventListener("luxe:notification", handler);
  }, []);

  const today = new Date().toDateString();
  const available   = rooms.filter((r) => r.status === "Available").length;
  const booked      = rooms.filter((r) => r.status === "Booked").length;
  const maintenance = rooms.filter((r) => r.status === "Maintenance").length;
  const occupancy   = rooms.length ? Math.round((booked / rooms.length) * 100) : 0;

  const todayBookings   = bookings.filter((b) => new Date(b.checkIn).toDateString() === today);
  const todayDepartures = bookings.filter((b) => new Date(b.checkOut).toDateString() === today);
  const dailyRevenue    = todayBookings.reduce((s, b) => s + (b.totalAmount || 0), 0);
  const totalRevenue    = bookings.reduce((s, b) => s + (b.totalAmount || 0), 0);

  const revenueByMonth = MONTHS.map((month, i) => ({
    month,
    revenue: bookings.filter((b) => new Date(b.checkIn).getMonth() === i)
      .reduce((s: number, b: any) => s + (b.totalAmount || 0), 0),
  }));

  const recentBookings = [...bookings]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const alertIcon: Record<string, React.ReactNode> = {
    maintenance:  <Wrench className="w-4 h-4" style={{ color: "#f59e0b" }} />,
    vip:          <Star className="w-4 h-4" style={{ color: "#d4a843" }} />,
    housekeeping: <CheckCircle2 className="w-4 h-4" style={{ color: "#10b981" }} />,
    payment:      <DollarSign className="w-4 h-4" style={{ color: "#c0392b" }} />,
    booking:      <CalendarCheck className="w-4 h-4" style={{ color: "#d4a843" }} />,
  };

  const cardStyle: React.CSSProperties = {
    background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "16px",
  };

  if (loading) return (
    <ManagerLayout>
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: "rgba(212,168,67,0.3)", borderTopColor: "#d4a843" }} />
      </div>
    </ManagerLayout>
  );

  return (
    <ManagerLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-bright">Command Center</h1>
          <p className="text-sm text-dim mt-0.5">
            {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <button onClick={() => load(true)} disabled={refreshing}
          className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl transition-all btn-ghost disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {/* ── Top Row: Occupancy + 4 Glass Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-[auto_1fr_1fr_1fr_1fr] gap-4 mb-6 items-stretch">
        {/* Occupancy Ring */}
        <div className="col-span-2 lg:col-span-1 rounded-2xl p-5 flex flex-col items-center justify-center gap-2"
          style={cardStyle}>
          <div className="relative">
            <OccupancyRing pct={occupancy} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold text-bright">{occupancy}%</span>
              <span className="text-xs text-dim">Occupied</span>
            </div>
          </div>
          <p className="text-sm font-semibold text-soft">Occupancy Rate</p>
          <p className="text-xs text-dim">{booked} of {rooms.length} rooms</p>
        </div>

        <GlassCard
          icon={<div className="w-9 h-9 rounded-xl grid place-items-center" style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.25)" }}><DollarSign className="w-5 h-5 text-emerald" /></div>}
          label="Daily Revenue" value={`$${dailyRevenue.toLocaleString()}`} sub="Today's earnings"
          onClick={() => navigate("/m/financials")}
        />
        <GlassCard
          icon={<div className="w-9 h-9 rounded-xl grid place-items-center" style={{ background: "rgba(212,168,67,0.15)", border: "1px solid rgba(212,168,67,0.25)" }}><LogIn className="w-5 h-5 text-gold" /></div>}
          label="Arrivals Today" value={todayBookings.length} sub="Check-ins scheduled"
          onClick={() => navigate("/m/bookings")}
        />
        <GlassCard
          icon={<div className="w-9 h-9 rounded-xl grid place-items-center" style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.25)" }}><LogOut className="w-5 h-5 text-sapphire" /></div>}
          label="Departures Today" value={todayDepartures.length} sub="Check-outs scheduled"
          onClick={() => navigate("/m/bookings")}
        />
        <GlassCard
          icon={<div className="w-9 h-9 rounded-xl grid place-items-center" style={{ background: "rgba(192,57,43,0.15)", border: "1px solid rgba(192,57,43,0.25)" }}><AlertTriangle className="w-5 h-5 text-imperial" /></div>}
          label="Active Alerts" value={alerts.filter((a) => a.priority === "high").length}
          sub={`${alerts.length} total notifications`}
        />
      </div>

      {/* ── Charts Row ── */}
      <div className="grid lg:grid-cols-[1fr_360px] gap-4 mb-6">
        {/* Revenue Chart */}
        <div className="rounded-2xl p-5" style={cardStyle}>
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-semibold text-bright">Revenue Trend</h3>
              <p className="text-xs text-dim mt-0.5">
                All-time: <span className="font-semibold text-gold">${(totalRevenue / 1000).toFixed(1)}k</span>
              </p>
            </div>
            <button onClick={() => navigate("/m/financials")}
              className="flex items-center gap-1 text-xs font-semibold text-gold transition-colors"
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#e8c96a"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#d4a843"}>
              Full Report <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={revenueByMonth}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#c0392b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#c0392b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#64748b" }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                formatter={(v: any) => [`$${(v / 1000).toFixed(1)}k`, "Revenue"]}
                contentStyle={{ background: "#112240", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, fontSize: 12, color: "#f0f4ff" }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#c0392b" strokeWidth={2}
                fill="url(#revGrad)" dot={{ fill: "#c0392b", r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Alert Center */}
        <div className="rounded-2xl flex flex-col overflow-hidden" style={cardStyle}>
          <div className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-gold" />
              <h3 className="font-semibold text-bright">Alert Center</h3>
            </div>
            {alerts.length > 0 && (
              <button onClick={() => updateAlerts([])}
                className="text-xs text-dim transition-colors"
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#e11d48"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#64748b"}>
                Clear all
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin divide-y"
            style={{ borderColor: "rgba(255,255,255,0.05)" }}>
            {alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald mb-2" />
                <p className="text-sm text-dim">All clear — no alerts</p>
              </div>
            ) : alerts.map((a) => (
              <div key={a.id} className="flex items-start gap-3 px-5 py-3.5 transition-colors cursor-pointer"
                onClick={() => setAlertDetail(a)}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                <div className="w-8 h-8 rounded-xl grid place-items-center shrink-0 mt-0.5"
                  style={{
                    background: a.priority === "high" ? "rgba(192,57,43,0.15)" : "rgba(245,158,11,0.15)",
                    border: a.priority === "high" ? "1px solid rgba(192,57,43,0.25)" : "1px solid rgba(245,158,11,0.25)",
                  }}>
                  {alertIcon[a.type] || <Bell className="w-4 h-4 text-dim" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-soft leading-snug">{a.msg}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="w-3 h-3 text-dim" />
                    <span className="text-xs text-dim">{a.time}</span>
                    {a.priority === "high" && (
                      <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full"
                        style={{ color: "#c0392b", background: "rgba(192,57,43,0.12)" }}>High</span>
                    )}
                  </div>
                </div>
                <button onClick={(e) => { e.stopPropagation(); updateAlerts(alerts.filter((x) => x.id !== a.id)); }}
                  className="text-dim transition-colors shrink-0 mt-0.5 text-xs"
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#e11d48"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#64748b"}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom Row ── */}
      <div className="grid lg:grid-cols-[280px_1fr] gap-4">
        {/* Room Status */}
        <div className="rounded-2xl p-5" style={cardStyle}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-bright">Room Status</h3>
            <button onClick={() => navigate("/m/floor-map")}
              className="text-xs font-semibold text-gold transition-colors"
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#e8c96a"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#d4a843"}>
              Floor Map
            </button>
          </div>
          <div className="space-y-3">
            {[
              { label: "Available",   count: available,   color: "#10b981", bg: "rgba(16,185,129,0.15)",  pct: rooms.length ? (available / rooms.length) * 100 : 0 },
              { label: "Occupied",    count: booked,      color: "#c0392b", bg: "rgba(192,57,43,0.15)",   pct: rooms.length ? (booked / rooms.length) * 100 : 0 },
              { label: "Maintenance", count: maintenance, color: "#f59e0b", bg: "rgba(245,158,11,0.15)",  pct: rooms.length ? (maintenance / rooms.length) * 100 : 0 },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                    <span className="text-soft">{item.label}</span>
                  </div>
                  <span className="font-bold text-bright">{item.count}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${item.pct}%`, background: item.color }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 flex items-center justify-between text-xs"
            style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
            <span className="text-dim">Total Rooms</span>
            <span className="font-bold text-bright">{rooms.length}</span>
          </div>
        </div>

        {/* Recent Bookings */}
        <div className="rounded-2xl overflow-hidden" style={cardStyle}>
          <div className="flex items-center justify-between px-5 py-4"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <h3 className="font-semibold text-bright">Recent Bookings</h3>
            <button onClick={() => navigate("/m/bookings")}
              className="flex items-center gap-1 text-xs font-semibold text-gold transition-colors"
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#e8c96a"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#d4a843"}>
              View all <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          {recentBookings.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <CalendarCheck className="w-8 h-8 text-dim mx-auto mb-2" />
              <p className="text-sm text-dim">No bookings yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full glass-table">
                <thead>
                  <tr>
                    {["Guest", "Room", "Check-in", "Check-out", "Amount", "Status"].map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {recentBookings.map((b, i) => (
                    <tr key={i}>
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl grid place-items-center shrink-0"
                            style={{ background: "rgba(212,168,67,0.12)", border: "1px solid rgba(212,168,67,0.2)" }}>
                            <span className="text-gold text-xs font-bold">
                              {(b.guestSnapshot?.name || "G").charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-bright">{b.guestSnapshot?.name || "Guest"}</p>
                            <p className="text-xs text-dim">{b.guestSnapshot?.email || ""}</p>
                          </div>
                        </div>
                      </td>
                      <td>{b.room?.type || "—"}</td>
                      <td>{b.checkIn ? new Date(b.checkIn).toLocaleDateString() : "—"}</td>
                      <td>{b.checkOut ? new Date(b.checkOut).toLocaleDateString() : "—"}</td>
                      <td><span className="font-semibold text-bright">${(b.totalAmount || 0).toLocaleString()}</span></td>
                      <td><StatusBadge status={b.status || "Pending"} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Alert Detail Modal ── */}
      {alertDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
          onClick={() => setAlertDetail(null)}>
          <div className="w-full max-w-md rounded-2xl overflow-hidden animate-fade-in"
            style={{ background: "#112240", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl grid place-items-center"
                  style={{
                    background: alertDetail.priority === "high" ? "rgba(192,57,43,0.2)" : "rgba(245,158,11,0.2)",
                    border: alertDetail.priority === "high" ? "1px solid rgba(192,57,43,0.4)" : "1px solid rgba(245,158,11,0.4)",
                  }}>
                  {alertIcon[alertDetail.type] || <Bell className="w-4 h-4 text-dim" />}
                </div>
                <div>
                  <p className="text-sm font-bold text-bright capitalize">{alertDetail.type?.replace("vip","Admin Alert").replace("housekeeping","Housekeeping").replace("maintenance","Maintenance").replace("payment","Payment").replace("booking","Booking")} Alert</p>
                  <p className="text-xs text-dim">{alertDetail.time}</p>
                </div>
              </div>
              <button onClick={() => setAlertDetail(null)}
                className="w-7 h-7 rounded-lg grid place-items-center text-dim transition-colors"
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#f0f4ff"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#64748b"}>
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              {/* Priority badge */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{
                    color: alertDetail.priority === "high" ? "#c0392b" : "#f59e0b",
                    background: alertDetail.priority === "high" ? "rgba(192,57,43,0.12)" : "rgba(245,158,11,0.12)",
                    border: alertDetail.priority === "high" ? "1px solid rgba(192,57,43,0.25)" : "1px solid rgba(245,158,11,0.25)",
                  }}>
                  {alertDetail.priority === "high" ? "🔴 High Priority" : "🟡 Medium Priority"}
                </span>
              </div>

              {/* Message */}
              <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <p className="text-xs text-dim uppercase tracking-wider font-semibold mb-2">Message</p>
                <p className="text-sm text-bright leading-relaxed">{alertDetail.msg}</p>
              </div>

              {/* Full notification data if available */}
              {alertDetail.fullData && (
                <div className="space-y-2">
                  {alertDetail.fullData.type && (
                    <DetailRow label="Type" value={alertDetail.fullData.type} />
                  )}
                  {alertDetail.fullData.hotelId && (
                    <DetailRow label="Hotel ID" value={alertDetail.fullData.hotelId} />
                  )}
                  {alertDetail.fullData.createdAt && (
                    <DetailRow label="Received At" value={new Date(alertDetail.fullData.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} />
                  )}
                  {alertDetail.fullData.isRead !== undefined && (
                    <DetailRow label="Status" value={alertDetail.fullData.isRead ? "Read" : "Unread"} />
                  )}
                </div>
              )}

              {/* Time */}
              <div className="flex items-center gap-2 pt-1">
                <Clock className="w-3.5 h-3.5 text-dim" />
                <span className="text-xs text-dim">{alertDetail.time}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-5 flex gap-3">
              <button onClick={() => { updateAlerts(alerts.filter((x: any) => x.id !== alertDetail.id)); setAlertDetail(null); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                style={{ background: "rgba(192,57,43,0.12)", color: "#c0392b", border: "1px solid rgba(192,57,43,0.25)" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(192,57,43,0.2)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(192,57,43,0.12)"}>
                Dismiss Alert
              </button>
              <button onClick={() => setAlertDetail(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                style={{ background: "rgba(255,255,255,0.06)", color: "#f0f4ff", border: "1px solid rgba(255,255,255,0.1)" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </ManagerLayout>
  );
}

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between py-2"
    style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
    <span className="text-xs text-dim">{label}</span>
    <span className="text-xs font-medium text-soft">{value}</span>
  </div>
);
