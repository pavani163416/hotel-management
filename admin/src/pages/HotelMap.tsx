import { useEffect, useState, useCallback } from "react";
import {
  BedDouble, Phone, Calendar, Wrench, RefreshCw, History,
  ChevronDown, Search, ArrowRightLeft, Check, AlertCircle,
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import Topbar from "@/components/Topbar";
import StatusBadge from "@/components/StatusBadge";
import Drawer from "@/components/Drawer";
import Modal from "@/components/Modal";
import { useSocket } from "@/hooks/useSocket";
import { adminReassignBooking, getRoomBookingHistory } from "@/services/api";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

type Room = {
  _id: string;
  roomNumber: string;
  type: string;
  pricePerNight: number;
  capacity: number;
  bedType: string;
  floor?: number;
  status: "Available" | "Booked" | "Maintenance" | "Blocked" | "Cleaning";
  displayStatus?: "Available" | "Booked" | "Maintenance" | "Blocked" | "Cleaning";
  activeBooking?: Booking | null;
  amenities?: string[];
  hotelStringId?: string;
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

type Hotel = { hotelId: string; name: string };

const STATUS_COLORS: Record<string, string> = {
  Available:   "bg-emerald-600 hover:bg-emerald-500",
  Booked:      "bg-red-600 hover:bg-red-500",
  Maintenance: "bg-amber-500 hover:bg-amber-400",
  Blocked:     "bg-slate-600 hover:bg-slate-500",
  Cleaning:    "bg-sky-500 hover:bg-sky-400",
};

const STATUS_DOT: Record<string, string> = {
  Available:   "bg-emerald-400",
  Booked:      "bg-red-400",
  Maintenance: "bg-amber-400",
  Blocked:     "bg-slate-400",
  Cleaning:    "bg-sky-400",
};

export default function HotelMap() {
  const [hotels, setHotels]       = useState<Hotel[]>([]);
  const [selectedHotel, setSelectedHotel] = useState<string>("");
  const [mapDate, setMapDate]       = useState(() => new Date().toISOString().slice(0, 10));
  const [rooms, setRooms]         = useState<Room[]>([]);
  const [bookings, setBookings]   = useState<Booking[]>([]);
  const [mapStats, setMapStats]   = useState({ total: 0, available: 0, booked: 0, maintenance: 0, cleaning: 0, blocked: 0, occupancyPct: 0 });
  const [loading, setLoading]     = useState(false);
  const [filterFloor, setFilterFloor]   = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [search, setSearch]       = useState("");
  const [selected, setSelected]   = useState<Room | null>(null);
  const [saving, setSaving]       = useState(false);
  const [saveMsg, setSaveMsg]     = useState("");
  const [drawerTab, setDrawerTab] = useState<"info" | "history">("info");
  const [history, setHistory]     = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Reassign modal
  const [reassignOpen, setReassignOpen] = useState(false);
  const [reassignBooking, setReassignBooking] = useState<Booking | null>(null);
  const [reassignTarget, setReassignTarget]   = useState<string>("");
  const [reassignError, setReassignError]     = useState("");
  const [reassigning, setReassigning]         = useState(false);

  const token = localStorage.getItem("luxe_admin_token");
  const authHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const fetchHistory = useCallback(async (roomId: string) => {
    setHistoryLoading(true);
    try {
      const res: any = await getRoomBookingHistory(roomId, 8);
      setHistory(res?.data || []);
    } catch { setHistory([]); }
    setHistoryLoading(false);
  }, []);

  // Load hotels
  useEffect(() => {
    fetch(`${API}/hotels`)
      .then(r => r.json())
      .then(d => {
        const list: Hotel[] = (d?.data || []).map((h: any) => ({ hotelId: h.hotelId, name: h.name }));
        setHotels(list);
        if (list.length) setSelectedHotel(list[0].hotelId);
      })
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    if (!selectedHotel) return;
    setLoading(true);
    try {
      const res = await fetch(
        `${API}/rooms/map-overview?hotelStringId=${selectedHotel}&date=${mapDate}`,
        { headers: authHeaders }
      ).then(r => r.json());
      const overview = res?.data || {};
      setRooms(overview.rooms || []);
      setBookings(overview.bookings || []);
      setMapStats(overview.stats || { total: 0, available: 0, booked: 0, maintenance: 0, cleaning: 0, blocked: 0, occupancyPct: 0 });
    } catch { setRooms([]); setBookings([]); }
    setLoading(false);
  }, [selectedHotel, mapDate]);

  useEffect(() => { load(); }, [load]);
  useSocket("newBooking",         useCallback(() => load(), [load]));
  useSocket("roomStatusUpdate", useCallback(() => load(), [load]));
  useSocket("booking_update",     useCallback(() => load(), [load]));
  useSocket("bookingCheckedIn",   useCallback(() => load(), [load]));
  useSocket("bookingCheckedOut",  useCallback(() => load(), [load]));

  const floors = Array.from(new Set(rooms.map(r => String(r.floor || 1)))).sort((a, b) => Number(a) - Number(b));

  const roomStatusOf = (r: Room) => r.displayStatus || r.status;

  const filtered = rooms.filter(r => {
    const matchFloor  = filterFloor  === "All" || String(r.floor || 1) === filterFloor;
    const matchStatus = filterStatus === "All" || roomStatusOf(r) === filterStatus;
    const matchSearch = !search || r.roomNumber.toLowerCase().includes(search.toLowerCase()) || r.type.toLowerCase().includes(search.toLowerCase());
    return matchFloor && matchStatus && matchSearch;
  });

  const groupedByFloor = floors.reduce((acc, floor) => {
    acc[floor] = filtered.filter(r => String(r.floor || 1) === floor);
    return acc;
  }, {} as Record<string, Room[]>);

  const getActiveBooking = (room: Room) =>
    room.activeBooking ||
    bookings.find(b =>
      (b.room?._id === room._id || b.room?.roomNumber === room.roomNumber) &&
      ["Confirmed", "CheckedIn", "Pending"].includes(b.status)
    ) || null;

  const handleStatusChange = async (status: string) => {
    if (!selected) return;
    setSaving(true); setSaveMsg("");
    try {
      const res = await fetch(`${API}/rooms/${selected._id}`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        setRooms(prev => prev.map(r => r._id === selected._id ? { ...r, status: status as any } : r));
        setSelected(prev => prev ? { ...prev, status: status as any } : null);
        setSaveMsg("Status updated");
        setTimeout(() => setSaveMsg(""), 2000);
      }
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
      // Use admin-scoped endpoint (no hotel isolation)
      const res: any = await adminReassignBooking(reassignBooking._id, reassignTarget);
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
    <AdminLayout>
      <Topbar title="Hotel Map" />
      <div className="p-6 space-y-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-text-primary">Hotel Floor Map</h1>
            <p className="text-sm text-muted mt-0.5">Live room occupancy and allocation management</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Hotel selector */}
            <div className="relative">
              <select
                value={selectedHotel}
                onChange={e => { setSelectedHotel(e.target.value); setSelected(null); setFilterFloor("All"); }}
                className="appearance-none pl-4 pr-10 py-2.5 border border-border rounded-xl text-sm font-medium text-text-primary outline-none focus:border-primary bg-white min-w-[200px]"
              >
                {hotels.map(h => <option key={h.hotelId} value={h.hotelId}>{h.name}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
            </div>
            <input
              type="date"
              value={mapDate}
              onChange={(e) => { setMapDate(e.target.value); setSelected(null); }}
              className="px-3 py-2.5 border border-border rounded-xl text-sm outline-none focus:border-primary bg-white"
              title="View occupancy for this date"
            />
            <button onClick={() => load()} className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl text-sm text-muted hover:text-text-primary hover:bg-surface-3 transition-colors">
              <RefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: "Available",   count: stats.available,   dot: "bg-emerald-400" },
            { label: "Occupied",    count: stats.booked,      dot: "bg-red-400" },
            { label: "Maintenance", count: stats.maintenance, dot: "bg-amber-400" },
            { label: "Cleaning",    count: stats.cleaning,    dot: "bg-sky-400" },
            { label: "Blocked",     count: stats.blocked,     dot: "bg-slate-400" },
          ].map(item => (
            <div key={item.label} className="bg-white rounded-xl border border-border p-3 flex items-center gap-3">
              <span className={`w-3 h-3 rounded-full shrink-0 ${item.dot}`} />
              <div>
                <p className="text-lg font-bold text-text-primary leading-none">{item.count}</p>
                <p className="text-xs text-muted mt-0.5">{item.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Occupancy bar */}
        <div className="bg-white rounded-xl border border-border p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-text-primary">Occupancy Rate</span>
            <span className="text-sm font-bold text-primary">{occupancyPct}%</span>
          </div>
          <div className="h-2 bg-surface-3 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${occupancyPct}%` }} />
          </div>
          <p className="text-xs text-muted mt-1">{stats.booked} of {rooms.length} rooms occupied</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search room number or type..."
              className="w-full pl-9 pr-4 py-2 border border-border rounded-xl text-sm outline-none focus:border-primary bg-white" />
          </div>
          <select value={filterFloor} onChange={e => setFilterFloor(e.target.value)}
            className="px-4 py-2 border border-border rounded-xl text-sm outline-none focus:border-primary bg-white">
            <option value="All">All Floors</option>
            {floors.map(f => <option key={f} value={f}>Floor {f}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-border rounded-xl text-sm outline-none focus:border-primary bg-white">
            <option value="All">All Status</option>
            {["Available", "Booked", "Maintenance", "Cleaning", "Blocked"].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>

        {/* Floor Grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          </div>
        ) : rooms.length === 0 ? (
          <div className="bg-white rounded-xl border border-border p-16 text-center">
            <BedDouble className="w-12 h-12 text-muted/30 mx-auto mb-3" />
            <p className="text-sm text-muted">No rooms found for this hotel.</p>
            <p className="text-xs text-muted mt-1">Add rooms from the Rooms page first.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {floors.map(floor => {
              const floorRooms = groupedByFloor[floor] || [];
              if (floorRooms.length === 0) return null;
              const floorBooked = floorRooms.filter(r => roomStatusOf(r) === "Booked").length;
              return (
                <div key={floor} className="bg-white rounded-xl border border-border overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-surface-2">
                    <h3 className="font-semibold text-text-primary text-sm">Floor {floor}</h3>
                    <span className="text-xs text-muted">{floorBooked}/{floorRooms.length} occupied</span>
                  </div>
                  <div className="p-4 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2">
                    {floorRooms.map(room => {
                      const booking = getActiveBooking(room);
                      return (
                        <button
                          key={room._id}
                          onClick={() => setSelected(room)}
                          title={`${room.roomNumber} — ${room.type} — ${roomStatusOf(room)}${booking ? `\n${booking.guestSnapshot?.name || ""}` : ""}`}
                          className={`relative aspect-square rounded-xl flex flex-col items-center justify-center
                            text-white font-semibold text-[10px] transition-all shadow-sm
                            ${STATUS_COLORS[roomStatusOf(room)] || "bg-slate-500"}
                            ${selected?._id === room._id ? "ring-2 ring-offset-1 ring-primary scale-105" : ""}
                          `}
                        >
                          <BedDouble className="w-3.5 h-3.5 mb-0.5" />
                          <span className="leading-none">{room.roomNumber}</span>
                          {booking && (
                            <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-white/80" />
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
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted">
          {Object.entries(STATUS_DOT).map(([status, dot]) => (
            <div key={status} className="flex items-center gap-1.5">
              <span className={`w-2.5 h-2.5 rounded-sm ${dot}`} />
              {status}
            </div>
          ))}
          <span className="ml-2">· White dot = active booking</span>
        </div>
      </div>

      {/* Room Detail Drawer */}
      <Drawer isOpen={!!selected} onClose={() => { setSelected(null); setSaveMsg(""); setDrawerTab("info"); setHistory([]); }} title={`Room #${selected?.roomNumber || ""}`} width="w-[440px]">
        {selected && (() => {
          const booking = getActiveBooking(selected);
          return (
            <div className="space-y-5">
              {/* Drawer Tabs */}
              <div className="flex gap-1 border-b border-border">
                {(["info", "history"] as const).map(t => (
                  <button key={t} onClick={() => { setDrawerTab(t); if (t === "history" && selected) fetchHistory(selected._id); }}
                    className={`px-4 py-2 text-xs font-semibold capitalize border-b-2 transition-colors ${
                      drawerTab === t ? "border-primary text-primary" : "border-transparent text-muted hover:text-text-primary"
                    }`}>
                    {t === "history" ? <span className="flex items-center gap-1"><History className="w-3.5 h-3.5" />History</span> : "Room Info"}
                  </button>
                ))}
              </div>
              {drawerTab === "history" ? (
                <div>
                  {historyLoading ? (
                    <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
                  ) : history.length === 0 ? (
                    <p className="text-sm text-muted text-center py-10">No booking history found.</p>
                  ) : (
                    <div className="space-y-3">
                      {history.map((b: any, i: number) => (
                        <div key={i} className="rounded-xl p-3 bg-surface-2 border border-border text-sm space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-text-primary">{b.guestSnapshot?.name || "Guest"}</span>
                            <StatusBadge status={b.status} />
                          </div>
                          <p className="text-xs text-muted">{b.guestSnapshot?.email}</p>
                          <div className="flex items-center gap-2 text-xs text-muted">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(b.checkIn).toLocaleDateString()} → {new Date(b.checkOut).toLocaleDateString()}
                            {b.nights && <span>({b.nights}n)</span>}
                          </div>
                          <p className="text-xs font-semibold text-text-primary">${b.totalAmount?.toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
              <>
              {/* Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${STATUS_DOT[selected.status] || "bg-slate-400"}`} />
                  <span className="font-semibold text-sm">{selected.status}</span>
                </div>
                <span className="text-xs text-muted">Floor {selected.floor || 1}</span>
              </div>

              {/* Room Info */}
              <section className="rounded-xl p-4 space-y-2 text-sm bg-surface-2 border border-border">
                {[
                  ["Room Number", selected.roomNumber],
                  ["Type", selected.type],
                  ["Price / Night", `$${selected.pricePerNight}`],
                  ["Capacity", `${selected.capacity} guests`],
                  ["Bed Type", selected.bedType || "King"],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between">
                    <span className="text-muted">{k}</span>
                    <span className="font-semibold text-text-primary">{v}</span>
                  </div>
                ))}
              </section>

              {/* Amenities */}
              {selected.amenities && selected.amenities.length > 0 && (
                <section>
                  <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Amenities</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selected.amenities.map((a, i) => (
                      <span key={i} className="px-2.5 py-1 text-xs font-medium rounded-full bg-primary-light text-primary border border-primary/20">{a}</span>
                    ))}
                  </div>
                </section>
              )}

              {/* Current Guest */}
              {booking && (
                <section>
                  <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Current Guest</p>
                  <div className="rounded-xl p-4 bg-surface-2 border border-border space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary-light grid place-items-center shrink-0">
                        <span className="text-primary font-bold text-sm">{booking.guestSnapshot.name.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-text-primary text-sm">{booking.guestSnapshot.name}</p>
                        <p className="text-xs text-muted">{booking.guestSnapshot.email}</p>
                      </div>
                    </div>
                    {booking.guestSnapshot.phone && (
                      <div className="flex items-center gap-2 text-xs text-muted">
                        <Phone className="w-3.5 h-3.5" /> {booking.guestSnapshot.phone}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-muted">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(booking.checkIn).toLocaleDateString()} → {new Date(booking.checkOut).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted">
                      <StatusBadge status={booking.status} />
                      <span className="font-semibold text-text-primary">${booking.totalAmount.toLocaleString()}</span>
                    </div>
                    <button
                      onClick={() => openReassign(booking)}
                      className="w-full mt-2 flex items-center justify-center gap-2 border border-primary/30 text-primary rounded-xl py-2 text-xs font-semibold hover:bg-primary-light transition-colors"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" /> Reassign to Another Room
                    </button>
                  </div>
                </section>
              )}

              {/* Quick Actions */}
              <section>
                <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">Quick Actions</p>
                {saveMsg && (
                  <div className="flex items-center gap-2 text-xs text-success bg-success-light rounded-lg px-3 py-2 mb-2 border border-success/20">
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
                      className="w-full flex items-center justify-center gap-2 border border-sky-400/30 text-sky-600 rounded-xl py-2.5 text-sm font-semibold hover:bg-sky-50 transition-colors disabled:opacity-60">
                      Mark Cleaning
                    </button>
                  )}
                  {selected.status !== "Maintenance" && (
                    <button onClick={() => handleStatusChange("Maintenance")} disabled={saving}
                      className="w-full flex items-center justify-center gap-2 border border-amber-400/30 text-amber-600 rounded-xl py-2.5 text-sm font-semibold hover:bg-amber-50 transition-colors disabled:opacity-60">
                      <Wrench className="w-4 h-4" /> Mark Maintenance
                    </button>
                  )}
                  {selected.status !== "Blocked" && (
                    <button onClick={() => handleStatusChange("Blocked")} disabled={saving}
                      className="w-full flex items-center justify-center gap-2 border border-slate-400/30 text-slate-600 rounded-xl py-2.5 text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-60">
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
            <div className="p-3 rounded-xl bg-surface-2 border border-border text-sm">
              <p className="font-semibold text-text-primary">{reassignBooking.guestSnapshot.name}</p>
              <p className="text-xs text-muted mt-0.5">
                {new Date(reassignBooking.checkIn).toLocaleDateString()} → {new Date(reassignBooking.checkOut).toLocaleDateString()}
              </p>
            </div>
          )}
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">Move to Room</label>
            <select value={reassignTarget} onChange={e => setReassignTarget(e.target.value)}
              className="w-full px-4 py-2.5 border border-border rounded-xl text-sm outline-none focus:border-primary bg-white">
              <option value="">— Select available room —</option>
              {availableForReassign.map(r => (
                <option key={r._id} value={r._id}>
                  {r.roomNumber} — {r.type} — Floor {r.floor || 1} — ${r.pricePerNight}/night
                </option>
              ))}
            </select>
          </div>
          {reassignError && (
            <div className="flex items-center gap-2 text-xs text-danger bg-danger-light rounded-lg px-3 py-2 border border-danger/20">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {reassignError}
            </div>
          )}
          <div className="flex gap-3 pt-1">
            <button onClick={() => setReassignOpen(false)}
              className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium text-muted hover:text-text-primary hover:bg-surface-3 transition-colors">
              Cancel
            </button>
            <button onClick={handleReassign} disabled={!reassignTarget || reassigning}
              className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-dark transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {reassigning ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
              Reassign
            </button>
          </div>
        </div>
      </Modal>
    </AdminLayout>
  );
}
