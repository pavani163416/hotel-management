import { useEffect, useState, useCallback } from "react";
import {
  AreaChart, Area, ResponsiveContainer, Tooltip,
} from "recharts";
import {
  DollarSign, TrendingUp, TrendingDown, Edit2, Check,
  Plus, Clock, Tag, AlertCircle, ChevronRight, BedDouble,
} from "lucide-react";
import ManagerLayout from "@/components/ManagerLayout";
import Modal from "@/components/Modal";
import StatusBadge from "@/components/StatusBadge";
import { createManagerPriceRequest, getManagerPriceRequests, getManagerRooms, updateManagerRoom } from "@/services/api";

type Room = {
  _id: string;
  roomNumber: string;
  type: string;
  pricePerNight: number;
  status: string;
};

type PricingRequest = {
  id: string;
  roomId: string;
  roomNumber: string;
  roomType: string;
  currentPrice: number;
  requestedPrice: number;
  reason: string;
  requestedBy: string;
  requestedAt: string;
  status: "Pending" | "Approved" | "Rejected";
  effectiveDate: string;
};

const DEMO_REQUESTS: PricingRequest[] = [
  { id: "1", roomId: "", roomNumber: "101", roomType: "Deluxe",    currentPrice: 480,  requestedPrice: 520,  reason: "Peak season adjustment",    requestedBy: "Alex Rivera", requestedAt: "2026-04-28T10:00:00Z", status: "Pending",  effectiveDate: "2026-05-01" },
  { id: "2", roomId: "", roomNumber: "205", roomType: "Suite",     currentPrice: 780,  requestedPrice: 850,  reason: "Competitor pricing review",  requestedBy: "Alex Rivera", requestedAt: "2026-04-27T14:30:00Z", status: "Approved", effectiveDate: "2026-05-01" },
  { id: "3", roomId: "", roomNumber: "312", roomType: "Standard",  currentPrice: 320,  requestedPrice: 290,  reason: "Low occupancy promotion",    requestedBy: "Alex Rivera", requestedAt: "2026-04-26T09:15:00Z", status: "Rejected", effectiveDate: "2026-05-01" },
  { id: "4", roomId: "", roomNumber: "401", roomType: "Penthouse", currentPrice: 1850, requestedPrice: 2100, reason: "Luxury upgrade completion",  requestedBy: "Alex Rivera", requestedAt: "2026-04-25T16:00:00Z", status: "Pending",  effectiveDate: "2026-06-01" },
  { id: "5", roomId: "", roomNumber: "102", roomType: "Deluxe",    currentPrice: 480,  requestedPrice: 460,  reason: "Off-season discount",        requestedBy: "Alex Rivera", requestedAt: "2026-04-24T11:00:00Z", status: "Approved", effectiveDate: "2026-05-15" },
];

// Sparkline demo data
const sparkGreen  = [{ v: 2 },{ v: 4 },{ v: 3 },{ v: 6 },{ v: 5 },{ v: 8 },{ v: 7 },{ v: 9 }];
const sparkGold   = [{ v: 9 },{ v: 7 },{ v: 8 },{ v: 6 },{ v: 9 },{ v: 8 },{ v: 10 },{ v: 9 }];
const sparkRed    = [{ v: 8 },{ v: 6 },{ v: 7 },{ v: 5 },{ v: 4 },{ v: 3 },{ v: 4 },{ v: 3 }];

// Gold wireframe empty-state SVG
function GoldWireframeEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="8" width="64" height="64" rx="12" stroke="#d4a843" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.5"/>
        <rect x="20" y="20" width="40" height="40" rx="8" stroke="#d4a843" strokeWidth="1" opacity="0.35"/>
        <circle cx="40" cy="40" r="12" stroke="#d4a843" strokeWidth="1.5" opacity="0.6"/>
        <path d="M40 28 L40 52 M28 40 L52 40" stroke="#d4a843" strokeWidth="1" opacity="0.4"/>
        <circle cx="40" cy="40" r="3" fill="#d4a843" opacity="0.7"/>
        <path d="M32 32 L48 48 M48 32 L32 48" stroke="#d4a843" strokeWidth="0.75" opacity="0.25"/>
      </svg>
      <div className="text-center">
        <p className="text-soft text-sm font-medium">No rooms found</p>
        <p className="text-dim text-xs mt-1">Add rooms to manage pricing</p>
      </div>
    </div>
  );
}

// Stat card with sparkline
function StatCard({ label, value, data, color, gradId, icon: Icon }: {
  label: string; value: string; data: { v: number }[];
  color: string; gradId: string; icon: any;
}) {
  return (
    <div className="rounded-2xl overflow-hidden relative"
      style={{
        background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
        border: "1px solid rgba(255,255,255,0.08)",
      }}>
      <div className="px-5 pt-5 pb-2">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg grid place-items-center"
            style={{ background: `${color}20`, border: `1px solid ${color}30` }}>
            <Icon className="w-4 h-4" style={{ color }} />
          </div>
          <span className="text-dim text-xs font-medium uppercase tracking-wider">{label}</span>
        </div>
        <p className="text-2xl font-bold text-bright">{value}</p>
      </div>
      {/* Sparkline */}
      <div className="h-14 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Tooltip
              contentStyle={{ display: "none" }}
              cursor={false}
            />
            <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2}
              fill={`url(#${gradId})`} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function Pricing() {
  const [rooms, setRooms]       = useState<Room[]>([]);
  const [requests, setRequests] = useState<PricingRequest[]>([]);
  const [loading, setLoading]   = useState(true);
  const [editRoom, setEditRoom] = useState<Room | null>(null);
  const [newPrice, setNewPrice] = useState("");
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");
  const [showRequest, setShowRequest] = useState(false);
  const [reqForm, setReqForm]   = useState({ roomId: "", requestedPrice: "", reason: "", effectiveDate: "" });
  const [filterStatus, setFilterStatus] = useState("All");

  const load = useCallback(async () => {
    try {
      const [roomRes, requestRes]: any[] = await Promise.all([
        getManagerRooms(),
        getManagerPriceRequests(),
      ]);
      setRooms(roomRes?.data || []);
      setRequests((requestRes?.data || []).map((r: any) => ({
        id: r._id,
        roomId: r.roomId?._id || r.roomId,
        roomNumber: r.roomNumber,
        roomType: r.roomId?.type || "Room",
        currentPrice: r.currentPrice,
        requestedPrice: r.requestedPrice,
        reason: r.reason || "",
        requestedBy: r.createdByName || "Manager",
        requestedAt: r.createdAt,
        status: r.status === "approved" ? "Approved" : r.status === "rejected" ? "Rejected" : "Pending",
        effectiveDate: r.effectiveDate ? r.effectiveDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
      })));
    } catch { setRooms([]); setRequests([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handlePriceUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRoom || !newPrice) return;
    setSaving(true); setError("");
    try {
      await updateManagerRoom(editRoom._id, { pricePerNight: Number(newPrice) });
      setRooms((prev) => prev.map((r) => r._id === editRoom._id ? { ...r, pricePerNight: Number(newPrice) } : r));
      setSuccess("Price updated successfully.");
      setTimeout(() => { setEditRoom(null); setNewPrice(""); setSuccess(""); }, 1000);
    } catch (err: any) {
      setError(err.message || "Failed to update price.");
    }
    setSaving(false);
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const room = rooms.find((r) => r._id === reqForm.roomId);
    if (!room) return;
    setSaving(true);
    setError("");
    try {
      await createManagerPriceRequest({
        roomId: reqForm.roomId,
        requestedPrice: Number(reqForm.requestedPrice),
        reason: reqForm.reason,
        effectiveDate: reqForm.effectiveDate,
      });
      await load();
    } catch (err: any) {
      setError(err.message || "Failed to submit price request.");
      setSaving(false);
      return;
    }
    setShowRequest(false);
    setReqForm({ roomId: "", requestedPrice: "", reason: "", effectiveDate: "" });
    setSaving(false);
  };

  const filteredRequests = requests.filter((r) =>
    filterStatus === "All" || r.status === filterStatus
  );

  const avgPrice = rooms.length ? Math.round(rooms.reduce((s, r) => s + r.pricePerNight, 0) / rooms.length) : 0;
  const maxPrice = rooms.length ? Math.max(...rooms.map((r) => r.pricePerNight)) : 0;
  const minPrice = rooms.length ? Math.min(...rooms.map((r) => r.pricePerNight)) : 0;

  // Input / label shared styles
  const inputStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#f0f4ff",
    borderRadius: "12px",
    padding: "10px 14px",
    fontSize: "0.875rem",
    width: "100%",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
  };
  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "0.7rem",
    fontWeight: 600,
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    marginBottom: "6px",
  };

  return (
    <ManagerLayout>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-bright">Pricing</h1>
          <p className="text-sm text-dim mt-0.5">Manage room rates and pricing requests</p>
        </div>
        {/* Imperial Red CTA */}
        <button
          onClick={() => setShowRequest(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
          style={{
            background: "linear-gradient(135deg, #c0392b 0%, #a93226 100%)",
            boxShadow: "0 4px 16px rgba(192,57,43,0.35)",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 24px rgba(192,57,43,0.5)";
            (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(192,57,43,0.35)";
            (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
          }}
        >
          <Plus className="w-4 h-4" /> New Request
        </button>
      </div>

      {/* ── Stat Cards with Sparklines ── */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatCard label="Average Rate" value={`$${avgPrice}`} data={sparkGold}  color="#d4a843" gradId="gradGold"  icon={DollarSign} />
        <StatCard label="Highest Rate" value={`$${maxPrice}`} data={sparkGreen} color="#10b981" gradId="gradGreen" icon={TrendingUp} />
        <StatCard label="Lowest Rate"  value={`$${minPrice}`} data={sparkRed}   color="#c0392b" gradId="gradRed"   icon={TrendingDown} />
      </div>

      {/* ── Main Grid ── */}
      <div className="grid lg:grid-cols-[1fr_420px] gap-4">

        {/* Room Rates */}
        <div className="rounded-2xl overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}>
          <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <h3 className="font-semibold text-bright">Room Rates</h3>
            <p className="text-xs text-dim mt-0.5">Click edit to update a room's price</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: "rgba(212,168,67,0.3)", borderTopColor: "#d4a843" }} />
            </div>
          ) : rooms.length === 0 ? (
            <GoldWireframeEmpty />
          ) : (
            <div className="divide-y" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
              {rooms.map((room) => {
                const pct = maxPrice ? Math.round((room.pricePerNight / maxPrice) * 100) : 0;
                return (
                  <div key={room._id} className="px-5 py-4 transition-colors"
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl grid place-items-center"
                          style={{ background: "rgba(212,168,67,0.12)", border: "1px solid rgba(212,168,67,0.2)" }}>
                          <span className="text-gold text-xs font-bold">#{room.roomNumber}</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-bright">{room.type}</p>
                          <p className="text-xs text-dim">Room {room.roomNumber}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-base font-bold text-bright">${room.pricePerNight}</span>
                        <span className="text-xs text-dim">/ night</span>
                        <button
                          onClick={() => { setEditRoom(room); setNewPrice(String(room.pricePerNight)); setError(""); setSuccess(""); }}
                          className="p-1.5 rounded-lg transition-all"
                          style={{ color: "#64748b" }}
                          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(212,168,67,0.12)"; (e.currentTarget as HTMLElement).style.color = "#d4a843"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#64748b"; }}
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {/* Price bar — imperial red fill */}
                    <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, background: "linear-gradient(90deg, #c0392b 0%, #d4a843 100%)" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pricing Requests */}
        <div className="rounded-2xl overflow-hidden flex flex-col"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}>
          <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <h3 className="font-semibold text-bright">Pricing Requests</h3>
            <p className="text-xs text-dim mt-0.5">Timeline of rate change requests</p>
          </div>

          {/* Filter pills */}
          <div className="px-5 py-3 flex gap-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            {["All", "Pending", "Approved", "Rejected"].map((s) => (
              <button key={s} onClick={() => setFilterStatus(s)}
                className="px-3 py-1 rounded-full text-xs font-semibold transition-all"
                style={filterStatus === s
                  ? { background: "linear-gradient(135deg, #c0392b 0%, #a93226 100%)", color: "#fff", boxShadow: "0 2px 8px rgba(192,57,43,0.3)" }
                  : { background: "rgba(255,255,255,0.05)", color: "#64748b", border: "1px solid rgba(255,255,255,0.07)" }
                }
                onMouseEnter={e => { if (filterStatus !== s) (e.currentTarget as HTMLElement).style.color = "#94a3b8"; }}
                onMouseLeave={e => { if (filterStatus !== s) (e.currentTarget as HTMLElement).style.color = "#64748b"; }}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-thin divide-y"
            style={{ borderColor: "rgba(255,255,255,0.05)" }}>
            {filteredRequests.map((req) => {
              const diff = req.requestedPrice - req.currentPrice;
              const pct  = Math.round((diff / req.currentPrice) * 100);
              const isUp = diff >= 0;
              return (
                <div key={req.id} className="px-5 py-4 transition-colors"
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-bright">Room #{req.roomNumber}</span>
                        <span className="text-xs text-dim">· {req.roomType}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-dim line-through">${req.currentPrice}</span>
                        <ChevronRight className="w-3 h-3 text-dim" />
                        <span className="text-sm font-bold text-bright">${req.requestedPrice}</span>
                        <span className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                          style={{
                            color:      isUp ? "#10b981" : "#c0392b",
                            background: isUp ? "rgba(16,185,129,0.12)" : "rgba(192,57,43,0.12)",
                          }}>
                          {isUp ? "+" : ""}{pct}%
                        </span>
                      </div>
                    </div>
                    <StatusBadge status={req.status} />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-dim">
                    <span className="flex items-center gap-1"><Tag className="w-3 h-3" /> {req.reason}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-dim mt-1">
                    <Clock className="w-3 h-3" />
                    Effective: {new Date(req.effectiveDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Edit Price Modal ── */}
      <Modal isOpen={!!editRoom} onClose={() => { setEditRoom(null); setError(""); setSuccess(""); }}
        title={`Update Price — Room #${editRoom?.roomNumber}`} size="sm">
        {success ? (
          <div className="flex flex-col items-center py-8 gap-3">
            <div className="w-12 h-12 rounded-full grid place-items-center"
              style={{ background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)" }}>
              <Check className="w-6 h-6 text-emerald" />
            </div>
            <p className="font-semibold text-bright">{success}</p>
          </div>
        ) : (
          <form onSubmit={handlePriceUpdate} className="space-y-4">
            <div className="rounded-xl p-4 flex items-center justify-between"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <span className="text-sm text-dim">Current price</span>
              <span className="font-bold text-bright">${editRoom?.pricePerNight} / night</span>
            </div>
            <div>
              <label style={labelStyle}>New Price ($ / night) *</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dim" />
                <input required type="number" min="1" value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  placeholder="e.g. 550"
                  className="glass-input"
                  style={{ ...inputStyle, paddingLeft: "36px" }}
                  onFocus={e => { e.currentTarget.style.borderColor = "rgba(212,168,67,0.5)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(212,168,67,0.1)"; }}
                  onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.boxShadow = "none"; }}
                />
              </div>
            </div>
            {error && (
              <div className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl"
                style={{ background: "rgba(225,29,72,0.12)", border: "1px solid rgba(225,29,72,0.25)", color: "#e11d48" }}>
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}
            <div className="flex gap-3">
              <button type="button" onClick={() => setEditRoom(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all btn-ghost">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all btn-imperial disabled:opacity-60">
                {saving ? "Saving..." : "Update Price"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* ── New Request Modal ── */}
      <Modal isOpen={showRequest} onClose={() => setShowRequest(false)} title="New Pricing Request" size="sm">
        <form onSubmit={handleRequestSubmit} className="space-y-4">
          <div>
            <label style={labelStyle}>Room *</label>
            <select required value={reqForm.roomId} onChange={(e) => setReqForm({ ...reqForm, roomId: e.target.value })}
              className="glass-select" style={{ ...inputStyle }}>
              <option value="">Select a room</option>
              {rooms.map((r) => (
                <option key={r._id} value={r._id}>#{r.roomNumber} — {r.type} (${r.pricePerNight}/night)</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Requested Price ($) *</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dim" />
              <input required type="number" min="1" value={reqForm.requestedPrice}
                onChange={(e) => setReqForm({ ...reqForm, requestedPrice: e.target.value })}
                placeholder="e.g. 550" style={{ ...inputStyle, paddingLeft: "36px" }}
                onFocus={e => { e.currentTarget.style.borderColor = "rgba(212,168,67,0.5)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(212,168,67,0.1)"; }}
                onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.boxShadow = "none"; }}
              />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Effective Date *</label>
            <input required type="date" value={reqForm.effectiveDate}
              onChange={(e) => setReqForm({ ...reqForm, effectiveDate: e.target.value })}
              style={{ ...inputStyle, colorScheme: "dark" }}
              onFocus={e => { e.currentTarget.style.borderColor = "rgba(212,168,67,0.5)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(212,168,67,0.1)"; }}
              onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.boxShadow = "none"; }}
            />
          </div>
          <div>
            <label style={labelStyle}>Reason *</label>
            <textarea required value={reqForm.reason} onChange={(e) => setReqForm({ ...reqForm, reason: e.target.value })}
              rows={2} placeholder="Reason for price change..."
              style={{ ...inputStyle, resize: "none" }}
              onFocus={e => { e.currentTarget.style.borderColor = "rgba(212,168,67,0.5)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(212,168,67,0.1)"; }}
              onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.boxShadow = "none"; }}
            />
          </div>
          <button type="submit"
            className="w-full py-3 rounded-xl font-semibold text-sm text-white btn-imperial">
            Submit Request
          </button>
        </form>
      </Modal>
    </ManagerLayout>
  );
}
