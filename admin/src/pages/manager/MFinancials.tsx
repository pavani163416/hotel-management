import { useEffect, useState, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from "recharts";
import {
  DollarSign, TrendingUp, TrendingDown, Download,
  XCircle, RefreshCw, FileText, Package, Plus, Trash2,
} from "lucide-react";
import ManagerLayout from "@/components/ManagerLayout";
import StatusBadge from "@/components/StatusBadge";
import Modal from "@/components/Modal";
import { getManagerBookings } from "@/services/api";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

type InventoryItem = {
  id: string;
  name: string;
  category: string;
  stock: number;
  minRequired: number;
  unit: string;
};

export default function Financials() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState<"revenue" | "cancellations" | "inventory">("revenue");
  const [period, setPeriod]     = useState<"weekly" | "monthly">("monthly");
  const [refreshing, setRefreshing] = useState(false);

  // Inventory Tracker State
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [showAddInv, setShowAddInv] = useState(false);
  const [invForm, setInvForm] = useState({ name: "", category: "Linen", stock: "100", minRequired: "30", unit: "pcs" });

  const adminData = JSON.parse(localStorage.getItem("luxe_admin") || "{}");
  const hotelId = adminData.assignedHotelId || "default";
  const invKey = `luxe_inventory_${hotelId}`;

  const load = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res: any = await getManagerBookings();
      setBookings(res?.data || []);
    } catch { setBookings([]); }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Load scoped inventory
  useEffect(() => {
    const stored = localStorage.getItem(invKey);
    if (stored) {
      setInventory(JSON.parse(stored));
    } else {
      const seeded: InventoryItem[] = [
        { id: "1", name: "Bed Sheets (King)", category: "Linen", stock: 120, minRequired: 30, unit: "pcs" },
        { id: "2", name: "Bath Towels", category: "Linen", stock: 250, minRequired: 50, unit: "pcs" },
        { id: "3", name: "Shampoo Bottles", category: "Toiletries", stock: 45, minRequired: 100, unit: "bottles" },
        { id: "4", name: "Mini-bar Sodas", category: "F&B", stock: 15, minRequired: 50, unit: "cans" },
        { id: "5", name: "Toilet Paper Rolls", category: "Toiletries", stock: 85, minRequired: 40, unit: "rolls" },
      ];
      setInventory(seeded);
      localStorage.setItem(invKey, JSON.stringify(seeded));
    }
  }, [invKey]);

  // Revenue by month (with safety guards)
  const revenueByMonth = MONTHS.map((month, i) => {
    const monthBookings = bookings.filter((b) => {
      if (!b.checkIn) return false;
      const d = new Date(b.checkIn);
      return !isNaN(d.getTime()) && d.getMonth() === i;
    });
    return {
      month,
      revenue: monthBookings.reduce((s: number, b: any) => s + (b.totalAmount || 0), 0),
      bookings: monthBookings.length,
    };
  });

  // Revenue by week (last 8 weeks)
  const revenueByWeek = Array.from({ length: 8 }, (_, i) => {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - (7 - i) * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    
    const weekBookings = bookings.filter((b) => {
      if (!b.checkIn) return false;
      const d = new Date(b.checkIn);
      return !isNaN(d.getTime()) && d >= weekStart && d < weekEnd;
    });
    
    return {
      week: `W${i + 1}`,
      revenue: weekBookings.reduce((s: number, b: any) => s + (b.totalAmount || 0), 0),
    };
  });

  const chartData = period === "monthly" ? revenueByMonth : revenueByWeek;

  const totalRevenue    = bookings.reduce((s, b) => s + (b.totalAmount || 0), 0);
  const confirmedRev    = bookings.filter((b) => ["Confirmed", "Completed", "CheckedIn", "CheckedOut"].includes(b.status))
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

  const adjustStock = (id: string, amount: number) => {
    const updated = inventory.map((item) => {
      if (item.id === id) {
        const newStock = Math.max(0, item.stock + amount);
        return { ...item, stock: newStock };
      }
      return item;
    });
    setInventory(updated);
    localStorage.setItem(invKey, JSON.stringify(updated));
  };

  const deleteInvItem = (id: string) => {
    const updated = inventory.filter((item) => item.id !== id);
    setInventory(updated);
    localStorage.setItem(invKey, JSON.stringify(updated));
  };

  const handleAddInv = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invForm.name) return;
    const newItem: InventoryItem = {
      id: Date.now().toString(),
      name: invForm.name,
      category: invForm.category,
      stock: Number(invForm.stock) || 0,
      minRequired: Number(invForm.minRequired) || 0,
      unit: invForm.unit || "pcs",
    };
    const updated = [...inventory, newItem];
    setInventory(updated);
    localStorage.setItem(invKey, JSON.stringify(updated));
    setShowAddInv(false);
    setInvForm({ name: "", category: "Linen", stock: "100", minRequired: "30", unit: "pcs" });
  };

  return (
    <ManagerLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-bright">Financials & Inventory</h1>
          <p className="text-sm text-dim mt-0.5">Revenue reports, cancellations, and stock tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => load(true)} disabled={refreshing}
            className="flex items-center gap-2 text-sm font-medium text-dim border border-white/10 rounded-xl px-4 py-2 hover:bg-white/5 hover:text-bright transition-all disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
          </button>
          {activeTab === "revenue" ? (
            <button onClick={exportCSV}
              className="btn-imperial flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          ) : activeTab === "inventory" ? (
            <button onClick={() => setShowAddInv(true)}
              className="btn-imperial flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all">
              <Plus className="w-4 h-4" /> Add Item
            </button>
          ) : null}
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

      {/* Inventory Tracking */}
      {activeTab === "inventory" && (
        <div className="glass-card rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5 bg-white/5">
                {["Item Name", "Category", "Stock Level", "Min Required", "Status", "Actions"].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-dim uppercase tracking-wider px-5 py-4 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {inventory.map((item) => {
                const isLow = item.stock < item.minRequired;
                return (
                  <tr key={item.id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-bright">{item.name}</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-soft">{item.category}</td>
                    <td className="px-5 py-4 text-sm font-semibold text-bright">
                      {item.stock} {item.unit}
                    </td>
                    <td className="px-5 py-4 text-sm text-dim">
                      {item.minRequired} {item.unit}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                        isLow ? "bg-ruby/10 text-ruby border border-ruby/20" : "bg-emerald/10 text-emerald border border-emerald/20"
                      }`}>
                        {isLow ? "Low Stock" : "In Stock"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => adjustStock(item.id, 10)}
                          className="px-2.5 py-1 text-xs font-bold text-emerald bg-emerald/5 hover:bg-emerald hover:text-white rounded border border-emerald/20 transition-all">
                          +10
                        </button>
                        <button onClick={() => adjustStock(item.id, -10)}
                          className="px-2.5 py-1 text-xs font-bold text-ruby bg-ruby/5 hover:bg-ruby hover:text-white rounded border border-ruby/20 transition-all">
                          -10
                        </button>
                        <button onClick={() => deleteInvItem(item.id)}
                          className="p-1.5 text-dim hover:text-ruby hover:bg-ruby/10 rounded transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Inventory Item Modal */}
      <Modal isOpen={showAddInv} onClose={() => setShowAddInv(false)} title="Add Inventory Item" size="md">
        <form onSubmit={handleAddInv} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-dim uppercase tracking-wider mb-1.5">Item Name *</label>
            <input required value={invForm.name} onChange={(e) => setInvForm({ ...invForm, name: e.target.value })}
              placeholder="e.g. Toiletries, Bed sheets"
              className="w-full border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gold bg-white/5 text-bright" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-dim uppercase tracking-wider mb-1.5">Category</label>
              <select value={invForm.category} onChange={(e) => setInvForm({ ...invForm, category: e.target.value })}
                className="w-full glass-select border border-white/10 rounded-xl px-3 py-2.5 text-sm outline-none">
                <option value="Linen" className="bg-neutral-900 text-bright">Linen</option>
                <option value="Toiletries" className="bg-neutral-900 text-bright">Toiletries</option>
                <option value="F&B" className="bg-neutral-900 text-bright">F&B</option>
                <option value="Cleaning Supplies" className="bg-neutral-900 text-bright">Cleaning Supplies</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-dim uppercase tracking-wider mb-1.5">Unit</label>
              <input required value={invForm.unit} onChange={(e) => setInvForm({ ...invForm, unit: e.target.value })}
                placeholder="pcs, bottles, cans"
                className="w-full border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gold bg-white/5 text-bright" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-dim uppercase tracking-wider mb-1.5">Initial Stock</label>
              <input required type="number" value={invForm.stock} onChange={(e) => setInvForm({ ...invForm, stock: e.target.value })}
                className="w-full border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gold bg-white/5 text-bright" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-dim uppercase tracking-wider mb-1.5">Min Required</label>
              <input required type="number" value={invForm.minRequired} onChange={(e) => setInvForm({ ...invForm, minRequired: e.target.value })}
                className="w-full border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gold bg-white/5 text-bright" />
            </div>
          </div>
          <button type="submit"
            className="w-full bg-primary text-white py-3 rounded-xl font-semibold text-sm hover:bg-primary-dark transition-colors mt-2">
            Add Inventory Item
          </button>
        </form>
      </Modal>
    </ManagerLayout>
  );
}
