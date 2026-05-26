import { useEffect, useState, useCallback } from "react";
import {
  BedDouble, Phone, Calendar, Wrench,
  ArrowRightLeft, Check, AlertCircle, RefreshCw, History, User,
} from "lucide-react";
import ManagerLayout from "@/components/ManagerLayout";
import Drawer from "@/components/Drawer";
import Modal from "@/components/Modal";
import StatusBadge from "@/components/StatusBadge";
import {
  getManagerMapOverview,
  updateManagerRoom, reassignManagerBooking, getRoomBookingHistory,
} from "@/services/api";
import { useSocket } from "@/hooks/useSocket";

type Room = {
  _id: string;
  roomNumber: string;
  type: string;
  pricePerNight: number;
  capacity: number;
  bedType: string;
  floor?: number | string;
  status: "Available" | "Booked" | "Maintenance" | "Blocked" | "Cleaning";
  displayStatus?: "Available" | "Booked" | "Maintenance" | "Blocked" | "Cleaning";
  activeBooking?: Booking | null;
  amenities?: string[];
};

type Booking = {
  _id: string;
  bookingRef?: string;
  guestSnapshot: { name: string; email: string; phone?: string };
  room?: { _id?: string; roomNumber?: string; type?: string };
  checkIn: string;
  checkOut: string;
  status: string;
  totalAmount: number;
};

const STATUS_COLORS: Record<string, string> = {
  Available:   "bg-emerald-600 hover:bg-emerald-500",
  Booked:      "bg-red-600   hover:bg-red-500",
  Maintenance: "bg-amber-500 hover:bg-amber-400",
  Blocked:     "bg-slate-600 hover:bg-slate-500",
  Cleaning:    "bg-sky-500   hover:bg-sky-400",
};

const STATUS_DOT: Record<string, string> = {
  Available:   "bg-emerald-400",
  Booked:      "bg-red-400",
  Maintenance: "bg-amber-400",
  Blocked:     "bg-slate-400",
  Cleaning:    "bg-sky-400",
};

export default function FloorMap() {
  const [mapDate, setMapDate]     = useState(() => new Date().toISOString().slice(0, 10));
  const [rooms, setRooms]       = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [mapStats, setMapStats] = useState({ total: 0, available: 0, booked: 0, maintenance: 0, cleaning: 0, blocked: 0, occupancyPct: 0 });
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<Room | null>(null);
  const [filterFloor, setFilterFloor]   = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [saving, setSaving]     = useState(false);
  const [saveMsg, setSaveMsg]   = useState("");
  const [drawerTab, setDrawerTab] = useState<"info" | "history">("info");
  const [history, setHistory]     = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Reassign modal
  const [reassignOpen, setReassignOpen]       = useState(false);
  const [reassignBooking, setReassignBooking] = useState<Booking | null>(null);
  const [reassignTarget, setReassignTarget]   = useState<string>("");
  const [reassignError, setReassignError]     = useState("");
  const [reassigning, setReassigning]         = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await getManagerMapOverview({ date: mapDate });
      const overview = res?.data || {};
      setRooms(overview.rooms || []);
      setBookings(overview.bookings || []);
      setMapStats(overview.stats || { total: 0, available: 0, booked: 0, maintenance: 0, cleaning: 0, blocked: 0, occupancyPct: 0 });
    } catch { setRooms([]); setBookings([]); }
    setLoading(false);
  }, [mapDate]);

  const fetchHistory = useCallback(async (roomId: string) => {
    setHistoryLoading(true);
    try {
      const res: any = await getRoomBookingHistory(roomId, 8);
      setHistory(res?.data || []);
    } catch { setHistory([]); }
    setHistoryLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useSocket("newBooking",       useCallback(() => load(), [load]));
  useSocket("roomStatusUpdate", useCallback(() => load(), [load]));
  useSocket("bookingCheckedIn", useCallback(() => load(), [load]));
  useSocket("bookingCheckedOut", useCallback(() => load(), [load]));
  useSocket("booking_update",     useCallback(() => load(), [load]));

  const roomStatusOf = (r: Room) => r.displayStatus || r.status;

  const floors = Array.from(new Set(rooms.map(r => String(r.floor || "1"))))
    .sort((a, b) => Number(a) - Number(b));

  const filtered = rooms.filter(r => {
    const matchFloor  = filterFloor  === "All" || String(r.floor || "1") === filterFloor;
    const matchStatus = filterStatus === "All" || roomStatusOf(r) === filterStatus;
    return matchFloor && matchStatus;
  });

  const groupedByFloor = floors.reduce((acc, floor) => {
    acc[floor] = filtered.filter(r => String(r.floor || "1") === floor);
    return acc;
  }, {} as Record<string, Room[]>);

  // Find active booking for a room (by roomNumber match)
  const getActiveBooking = (room: Room): Booking | null =>
    room.activeBooking ||
    bookings.find(b =>
      (b.room?.roomNumber === room.roomNumber || b.room?._id === room._id) &&
      ["Confirmed", "CheckedIn", "Pending"].includes(b.status)
    ) || null;

  const handleStatusChange = async (status: string) => {
    if (!selected) return;
    setSaving(true); setSaveMsg("");
    try {
      await updateManagerRoom(selected._id, { status });
      setRooms(prev => prev.map(r => r._id === selected._id ? { ...r, status: status as any } : r));
      setSelected(prev => prev ? { ...prev, status: status as any } : null);
      setSaveMsg("Status updated");
      setTimeout(() => setSaveMsg(""), 2000);
    } catch { /* silent */ }
    setSaving(false);
  };

  const openReassign = (booking: Booking) => {
    setReassignBooking(booking);
    setReassignTarget("");
    setReassignError("");
    setReassignOpen(true);
  };

  const handleReassign = async () => {
    if (!reassignBooking || !reassignTarget) return;
    setReassigning(true); setReassignError("");
    try {
      const res: any = await reassignManagerBooking(reassignBooking._id, reassignTarget);
      if (res?.success) {
        setReassignOpen(false);
        setSelected(null);
        load();
      } else {
        setReassignError(res?.message || "Reassignment failed");
      }
    } catch (e: any) {
      setReassignError(e.message || "Network error");
    }
    setReassigning(false);
  };

  const stats = {
    available:   mapStats.available,
    booked:      mapStats.booked,
    maintenance: mapStats.maintenance,
    cleaning:    mapStats.cleaning,
    blocked:     mapStats.blocked,
  };
  const occupancyPct = mapStats.occupancyPct;

  const selectedBooking = selected ? getActiveBooking(selected) : null;
  const availableForReassign = rooms.filter(r =>
    r._id !== selected?._id && roomStatusOf(r) === "Available"
  );

  return (
    <ManagerLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-bright">Hotel Map</h1>
          <p className="text-sm text-dim mt-0.5">Interactive room status and allocation</p>
        </div>
        <input
          type="date"
          value={mapDate}
          onChange={(e) => { setMapDate(e.target.value); setSelected(null); }}
          className="px-3 py-2 border border-white/10 rounded-xl text-sm outline-none bg-white/5 text-bright"
        />
        <button onClick={() => load()}
          className="flex items-center gap-2 px-4 py-2 border border-white/10 rounded-xl text-sm text-soft hover:text-bright hover:bg-white/5 transition-colors">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
        {[
          { label: "Available",   count: stats.available,   dot: "bg-emerald-400" },
          { label: "Occupied",    count: stats.booked,      dot: "bg-red-400" },
          { label: "Maintenance", count: stats.maintenance, dot: "bg-amber-400" },
          { label: "Cleaning",    count: stats.cleaning,    dot: "bg-sky-400" },
          { label: "Blocked",     count: stats.blocked,     dot: "bg-slate-400" },
        ].map(item => (
          <div key={item.label} className="glass-card rounded-xl p-3 flex items-center gap-3">
            <span className={`w-3 h-3 rounded-full shrink-0 ${item.dot}`} />
            <div>
              <p className="text-lg font-bold text-bright leading-none">{item.count}</p>
              <p className="text-[10px] text-dim mt-0.5">{item.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Occupancy bar */}
      <div className="glass-card rounded-xl p-4 mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-soft">Occupancy</span>
          <span className="text-sm font-bold text-bright">{occupancyPct}%</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${occupancyPct}%`, background: "linear-gradient(90deg, #c0392b, #e74c3c)" }} />
        </div>
        <p className="text-xs text-dim mt-1">{stats.booked} of {rooms.length} rooms occupied</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <select value={filterFloor} onChange={e => setFilterFloor(e.target.value)}
          className="glass-select border border-white/10 rounded-xl px-3 py-2 text-sm outline-none">
          <option value="All">All Floors</option>
          {floors.map(f => <option key={f} value={f}>Floor {f}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="glass-select border border-white/10 rounded-xl px-3 py-2 text-sm outline-none">
          <option value="All">All Status</option>
          {["Available", "Booked", "Maintenance", "Cleaning", "Blocked"].map(s =>
            <option key={s}>{s}</option>
          )}
        </select>
      </div>

      {/* Floor Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : rooms.length === 0 ? (
        <div className="glass-card rounded-2xl p-16 text-center">
          <BedDouble className="w-12 h-12 text-white/10 mx-auto mb-4" />
          <p className="text-sm text-dim">No rooms found. Add rooms from the Rooms page.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {floors.map(floor => {
            const floorRooms = groupedByFloor[floor] || [];
            if (floorRooms.length === 0) return null;
            const floorBooked = floorRooms.filter(r => roomStatusOf(r) === "Booked").length;
            return (
              <div key={floor} className="glass-card rounded-2xl border border-white/10 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
                  <h3 className="font-semibold text-bright text-sm">Floor {floor}</h3>
                  <span className="text-xs text-dim">{floorBooked}/{floorRooms.length} occupied</span>
                </div>
                <div className="p-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-3">
                  {floorRooms.map(room => {
                    const booking = getActiveBooking(room);
                    return (
                      <button
                        key={room._id}
                        onClick={() => setSelected(room)}
                        title={`${room.roomNumber} — ${room.type} — ${roomStatusOf(room)}${booking ? `\n${booking.guestSnapshot?.name || ""}` : ""}`}
                        className={`relative rounded-xl flex flex-col items-center justify-center gap-1
                          text-white font-semibold transition-all shadow-sm overflow-hidden
                          px-2 py-3 min-h-[70px]
                          ${STATUS_COLORS[roomStatusOf(room)] || "bg-white/10"}
                          ${selected?._id === room._id ? "ring-2 ring-gold scale-105" : ""}
                        `}
                      >
                        <BedDouble className="w-4 h-4 shrink-0" />
                        <span className="text-[10px] leading-tight text-center w-full truncate px-1">
                          {room.roomNumber}
                        </span>
                        {booking && (
                          <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-white/80" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-dim">
        {Object.entries(STATUS_DOT).map(([status, dot]) => (
          <div key={status} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-sm ${dot}`} />
            {status}
          </div>
        ))}
        <span className="ml-2">· White dot = active booking</span>
      </div>

      {/* Room Detail Drawer */}
      <Drawer
        isOpen={!!selected}
        onClose={() => { setSelected(null); setSaveMsg(""); setDrawerTab("info"); setHistory([]); }}
        title={`Room #${selected?.roomNumber || ""}`}
        width="w-[420px]"
      >
        {selected && (() => {
          const booking = getActiveBooking(selected);
          return (
            <div className="space-y-5">
              {/* Drawer Tabs */}
              <div className="flex gap-1 border-b border-white/10">
                {(["info", "history"] as const).map(t => (
                  <button key={t} onClick={() => { setDrawerTab(t); if (t === "history" && selected) fetchHistory(selected._id); }}
                    className={`px-4 py-2 text-xs font-semibold capitalize border-b-2 transition-colors ${
                      drawerTab === t ? "border-gold text-gold" : "border-transparent text-dim hover:text-bright"
                    }`}>
                    {t === "history" ? <span className="flex items-center gap-1"><History className="w-3.5 h-3.5" />History</span> : "Room Info"}
                  </button>
                ))}
              </div>
              {drawerTab === "history" ? (
                <div>
                  {historyLoading ? (
                    <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>
                  ) : history.length === 0 ? (
                    <p className="text-sm text-dim text-center py-10">No booking history found.</p>
                  ) : (
                    <div className="space-y-3">
                      {history.map((b: any, i: number) => (
                        <div key={i} className="rounded-xl p-3 text-sm space-y-1"
                          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-bright">{b.guestSnapshot?.name || "Guest"}</span>
                            <StatusBadge status={b.status} />
                          </div>
                          <p className="text-xs text-dim">{b.guestSnapshot?.email}</p>
                          <div className="flex items-center gap-2 text-xs text-soft">
                            <Calendar className="w-3.5 h-3.5 text-gold" />
                            {new Date(b.checkIn).toLocaleDateString()} → {new Date(b.checkOut).toLocaleDateString()}
                            {b.nights && <span>({b.nights}n)</span>}
                          </div>
                          <p className="text-xs font-semibold text-bright">${b.totalAmount?.toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${STATUS_DOT[selected.status] || "bg-slate-400"}`} />
                      <span className="font-semibold text-sm text-bright">{selected.status}</span>
                    </div>
                    <span className="text-xs text-dim">Floor {selected.floor || "1"}</span>
                  </div>

              {/* Room Info */}
              <section>
                <h3 className="text-xs font-semibold text-dim uppercase tracking-wider mb-3">Room Details</h3>
                <div className="rounded-xl p-4 space-y-2 text-sm"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  {[
                    ["Type", selected.type],
                    ["Price / Night", `$${selected.pricePerNight}`],
                    ["Capacity", `${selected.capacity} guests`],
                    ["Bed Type", selected.bedType || "King"],
                  ].map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between">
                      <span className="text-soft">{k}</span>
                      <span className="font-semibold text-bright">{v}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Amenities */}
              {selected.amenities && selected.amenities.length > 0 && (
                <section>
                  <h3 className="text-xs font-semibold text-dim uppercase tracking-wider mb-2">Amenities</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.amenities.map((a, i) => (
                      <span key={i} className="px-2.5 py-1 text-xs font-medium rounded-full"
                        style={{ background: "rgba(212,168,67,0.15)", color: "#d4a843", border: "1px solid rgba(212,168,67,0.2)" }}>
                        {a}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {/* Current Guest */}
              {booking && (
                <section>
                  <h3 className="text-xs font-semibold text-dim uppercase tracking-wider mb-3">Current Guest</h3>
                  <div className="rounded-xl p-4"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl grid place-items-center"
                        style={{ background: "rgba(212,168,67,0.15)", border: "1px solid rgba(212,168,67,0.25)" }}>
                        <User className="w-5 h-5 text-gold" />
                      </div>
                      <div>
                        <p className="font-semibold text-bright">{booking.guestSnapshot.name}</p>
                        <p className="text-xs text-dim">{booking.guestSnapshot.email}</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-xs">
                      {booking.guestSnapshot.phone && (
                        <div className="flex items-center gap-2 text-soft">
                          <Phone className="w-3.5 h-3.5 text-gold" />
                          {booking.guestSnapshot.phone}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-soft">
                        <Calendar className="w-3.5 h-3.5 text-gold" />
                        {new Date(booking.checkIn).toLocaleDateString()} → {new Date(booking.checkOut).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={booking.status} />
                        <span className="font-semibold text-bright">${booking.totalAmount.toLocaleString()}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => openReassign(booking)}
                      className="w-full mt-3 flex items-center justify-center gap-2 border border-gold/30 text-gold rounded-xl py-2 text-xs font-semibold hover:bg-gold/10 transition-colors"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" /> Reassign to Another Room
                    </button>
                  </div>
                </section>
              )}

              {/* Quick Actions */}
              <section>
                <h3 className="text-xs font-semibold text-dim uppercase tracking-wider mb-3">Quick Actions</h3>
                {saveMsg && (
                  <div className="flex items-center gap-2 text-xs text-emerald-400 rounded-lg px-3 py-2 mb-2"
                    style={{ background: "rgba(52,211,153,0.1)", border: "1px solid rgba(52,211,153,0.2)" }}>
                    <Check className="w-3.5 h-3.5" /> {saveMsg}
                  </div>
                )}
                <div className="space-y-2">
                  {selected.status !== "Available" && (
                    <button onClick={() => handleStatusChange("Available")} disabled={saving}
                      className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-60">
                      <Check className="w-4 h-4" /> Mark Available
                    </button>
                  )}
                  {selected.status !== "Cleaning" && (
                    <button onClick={() => handleStatusChange("Cleaning")} disabled={saving}
                      className="w-full flex items-center justify-center gap-2 border border-sky-400/30 text-sky-400 rounded-xl py-2.5 text-sm font-semibold hover:bg-sky-400/10 transition-colors disabled:opacity-60">
                      Mark Cleaning
                    </button>
                  )}
                  {selected.status !== "Maintenance" && (
                    <button onClick={() => handleStatusChange("Maintenance")} disabled={saving}
                      className="w-full flex items-center justify-center gap-2 border border-warning/30 text-warning rounded-xl py-2.5 text-sm font-semibold hover:bg-warning/10 transition-colors disabled:opacity-60">
                      <Wrench className="w-4 h-4" /> Mark Maintenance
                    </button>
                  )}
                  {selected.status !== "Blocked" && (
                    <button onClick={() => handleStatusChange("Blocked")} disabled={saving}
                      className="w-full flex items-center justify-center gap-2 border border-white/10 text-soft rounded-xl py-2.5 text-sm font-semibold hover:bg-white/5 transition-colors disabled:opacity-60">
                      Block Room
                    </button>
                  )}
                </div>
              </section>
            </>
              )}
            </div>
          );
        })()}
      </Drawer>

      {/* Reassign Modal */}
      <Modal isOpen={reassignOpen} onClose={() => setReassignOpen(false)} title="Reassign Booking" size="sm">
        <div className="space-y-4">
          {reassignBooking && (
            <div className="p-3 rounded-xl text-sm"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <p className="font-semibold text-bright">{reassignBooking.guestSnapshot.name}</p>
              <p className="text-xs text-dim mt-0.5">
                {new Date(reassignBooking.checkIn).toLocaleDateString()} → {new Date(reassignBooking.checkOut).toLocaleDateString()}
              </p>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-dim uppercase tracking-wider mb-1.5">Move to Room</label>
            <select value={reassignTarget} onChange={e => setReassignTarget(e.target.value)}
              className="w-full glass-select border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none">
              <option value="">— Select available room —</option>
              {availableForReassign.map(r => (
                <option key={r._id} value={r._id}>
                  {r.roomNumber} — {r.type} — Floor {r.floor || 1} — ${r.pricePerNight}/night
                </option>
              ))}
            </select>
            {availableForReassign.length === 0 && (
              <p className="text-xs text-dim mt-1">No available rooms to reassign to.</p>
            )}
          </div>
          {reassignError && (
            <div className="flex items-center gap-2 text-xs text-ruby rounded-lg px-3 py-2"
              style={{ background: "rgba(192,57,43,0.1)", border: "1px solid rgba(192,57,43,0.2)" }}>
              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {reassignError}
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button onClick={() => setReassignOpen(false)}
              className="flex-1 py-2.5 border border-white/10 rounded-xl text-sm font-medium text-soft hover:text-bright hover:bg-white/5 transition-colors">
              Cancel
            </button>
            <button onClick={handleReassign} disabled={!reassignTarget || reassigning}
              className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-dark transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {reassigning
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <ArrowRightLeft className="w-4 h-4" />
              }
              Reassign
            </button>
          </div>
        </div>
      </Modal>
    </ManagerLayout>
  );
}
