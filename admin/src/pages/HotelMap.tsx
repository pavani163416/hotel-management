import { useCallback, useEffect, useMemo, useState } from "react";
import { BedDouble, CalendarDays, ChevronDown, RefreshCw, Search, X } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import Topbar from "@/components/Topbar";
import StatusBadge from "@/components/StatusBadge";
import { getHotels, getHotelMapOverview, getRoomBookingHistory, updateAdminRoom, updateRoomCleaningStatus, updateRoomMaintenanceStatus } from "@/services/api";

type Hotel = { hotelId: string; name: string };
type Room = {
  _id: string;
  roomNumber: string;
  type: string;
  floor?: number | string;
  status: string;
  cleaningStatus?: string;
  maintenanceStatus?: string;
  displayStatus?: string;
  activeBooking?: any;
  hotelStringId?: string;
};
type Booking = { _id: string; guestSnapshot?: { name?: string }; status?: string; checkIn?: string; checkOut?: string; };

type Stats = {
  total: number;
  available: number;
  occupied: number;
  maintenance: number;
  cleaning: number;
  blocked: number;
  occupancyPct: number;
};

const STATUS_CLASSES: Record<string, string> = {
  Available: "bg-emerald-600 hover:bg-emerald-500",
  Booked: "bg-red-600 hover:bg-red-500",
  Occupied: "bg-red-600 hover:bg-red-500",
  Reserved: "bg-purple-600 hover:bg-purple-500",
  Maintenance: "bg-amber-500 hover:bg-amber-400",
  Cleaning: "bg-sky-500 hover:bg-sky-400",
  Blocked: "bg-slate-600 hover:bg-slate-500",
};

const STATUS_LABELS: string[] = ["Available", "Occupied", "Reserved", "Maintenance", "Cleaning", "Blocked"];
const CLEANING_LABELS: string[] = ["Clean", "Dirty", "In Progress", "Inspected"];
const MAINTENANCE_LABELS: string[] = ["None", "Requested", "In Progress", "Completed"];

export default function HotelMap() {
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [selectedHotel, setSelectedHotel] = useState<string>("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rooms, setRooms] = useState<Room[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, available: 0, occupied: 0, maintenance: 0, cleaning: 0, blocked: 0, occupancyPct: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [history, setHistory] = useState<Booking[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchHotels = useCallback(async () => {
    try {
      const res: any = await getHotels();
      const list = (res?.data || []).map((hotel: any) => ({ hotelId: hotel.hotelId, name: hotel.name }));
      setHotels(list);
      if (!selectedHotel && list.length) {
        setSelectedHotel(list[0].hotelId);
      }
    } catch {
      setHotels([]);
    }
  }, [selectedHotel]);

  const loadMap = useCallback(async () => {
    if (!selectedHotel) return;
    setLoading(true);
    try {
      const res: any = await getHotelMapOverview({ hotelStringId: selectedHotel, date });
      const data = res?.data || {};
      setRooms(data.rooms || []);
      setStats(data.stats || { total: 0, available: 0, occupied: 0, maintenance: 0, cleaning: 0, blocked: 0, occupancyPct: 0 });
    } catch {
      setRooms([]);
      setStats({ total: 0, available: 0, occupied: 0, maintenance: 0, cleaning: 0, blocked: 0, occupancyPct: 0 });
    }
    setLoading(false);
  }, [date, selectedHotel]);

  useEffect(() => { fetchHotels(); }, [fetchHotels]);
  useEffect(() => { loadMap(); }, [loadMap]);

  // Socket.IO Listener for real-time room updates
  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL || "ws://localhost:5000/ws?role=admin";
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "room_update" && msg.data) {
          const updatedRoom = msg.data;
          
          setRooms((prevRooms) => {
            const idx = prevRooms.findIndex((r) => r._id === updatedRoom._id);
            if (idx === -1) return prevRooms;
            const newRooms = [...prevRooms];
            // Compute displayStatus mimicking the backend priority
            let op = updatedRoom.status || "Available";
            if (updatedRoom.maintenanceStatus === "Requested" || updatedRoom.maintenanceStatus === "In Progress" || updatedRoom.status === "Maintenance") {
              op = "Maintenance";
            } else if (updatedRoom.cleaningStatus === "Dirty" || updatedRoom.cleaningStatus === "In Progress" || updatedRoom.status === "Cleaning") {
              op = "Cleaning";
            } else if (updatedRoom.status === "Blocked") {
              op = "Blocked";
            } else if (updatedRoom.status === "Booked" || updatedRoom.status === "Occupied") {
              op = "Occupied";
            } else {
              op = "Available";
            }
            newRooms[idx] = { ...prevRooms[idx], ...updatedRoom, displayStatus: op };
            
            // If this is the selected room, update it
            if (selectedRoom?._id === updatedRoom._id) {
              setSelectedRoom(newRooms[idx]);
            }
            
            return newRooms;
          });
        }
      } catch (err) {
        console.error("WS Parse error", err);
      }
    };

    return () => ws.close();
  }, [selectedRoom?._id]);

  const floors = useMemo(() => {
    return Array.from(new Set(rooms.map((room) => String(room.floor || 1)))).sort((a, b) => Number(a) - Number(b));
  }, [rooms]);

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      const matchesStatus = filterStatus === "All" || room.displayStatus === filterStatus || room.status === filterStatus;
      const matchesSearch = !search || room.roomNumber.toLowerCase().includes(search.toLowerCase()) || room.type.toLowerCase().includes(search.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [filterStatus, rooms, search]);

  const groupedRooms = useMemo(() => {
    return floors.reduce((acc: Record<string, Room[]>, floor) => {
      acc[floor] = filteredRooms.filter((room) => String(room.floor || 1) === floor);
      return acc;
    }, {});
  }, [filteredRooms, floors]);

  const loadHistory = async (roomId: string) => {
    setHistoryLoading(true);
    try {
      const res: any = await getRoomBookingHistory(roomId, 6);
      setHistory(res?.data || []);
    } catch {
      setHistory([]);
    }
    setHistoryLoading(false);
  };

  const openRoom = async (room: Room) => {
    setSelectedRoom(room);
    await loadHistory(room._id);
  };

  const handleRoomStatus = async (status: string) => {
    if (!selectedRoom) return;
    setSaving(true);
    try {
      await updateAdminRoom(selectedRoom._id, { status });
      // UI update is handled by the WebSocket listener now
    } catch {}
    setSaving(false);
  };

  const handleCleaningStatus = async (cleaningStatus: string) => {
    if (!selectedRoom) return;
    setSaving(true);
    try {
      await updateRoomCleaningStatus(selectedRoom._id, { cleaningStatus });
    } catch {}
    setSaving(false);
  };

  const handleMaintenanceStatus = async (maintenanceStatus: string) => {
    if (!selectedRoom) return;
    setSaving(true);
    try {
      await updateRoomMaintenanceStatus(selectedRoom._id, { maintenanceStatus });
    } catch {}
    setSaving(false);
  };

  return (
    <AdminLayout>
      <Topbar title="Hotel Map" />
      <div className="p-6 space-y-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Hotel Map</h1>
            <p className="mt-1 text-sm text-muted">View room occupancy and status across properties.</p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[220px_minmax(220px,1fr)_auto]">
            <div className="relative">
              <select
                value={selectedHotel}
                onChange={(e) => { setSelectedHotel(e.target.value); setSelectedRoom(null); }}
                className="w-full appearance-none rounded-xl border border-border bg-white px-4 py-2 text-sm text-text-primary outline-none focus:border-primary"
              >
                {hotels.map((hotel) => (
                  <option key={hotel.hotelId} value={hotel.hotelId}>{hotel.name}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            </div>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-xl border border-border bg-white px-4 py-2 text-sm text-text-primary outline-none focus:border-primary"
            />
            <button
              onClick={loadMap}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-2 text-sm font-semibold text-text-primary transition hover:border-primary hover:text-primary"
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {[
            { label: "Available", value: stats.available, color: "bg-emerald-400" },
            { label: "Occupied", value: stats.occupied, color: "bg-red-400" },
            { label: "Maintenance", value: stats.maintenance, color: "bg-amber-400" },
            { label: "Cleaning", value: stats.cleaning, color: "bg-sky-400" },
            { label: "Blocked", value: stats.blocked, color: "bg-slate-400" },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-border bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <span className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
                <p className="text-xs uppercase tracking-[0.2em] text-muted">{item.label}</p>
              </div>
              <p className="mt-3 text-3xl font-bold text-text-primary">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_360px]">
          <div className="rounded-2xl border border-border bg-white p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">Rooms</h2>
                <p className="text-sm text-muted">Use filters to narrow the map view.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search rooms"
                    className="w-full rounded-xl border border-border bg-surface-2 py-2 pl-10 pr-4 text-sm text-text-primary outline-none focus:border-primary"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="rounded-xl border border-border bg-white px-4 py-2 text-sm text-text-primary outline-none focus:border-primary"
                >
                  <option value="All">All Status</option>
                  {STATUS_LABELS.map((status) => <option key={status} value={status}>{status}</option>)}
                </select>
              </div>
            </div>

            <div className="mt-4 space-y-4">
              {loading ? (
                <div className="flex h-48 items-center justify-center text-muted">Loading map...</div>
              ) : filteredRooms.length === 0 ? (
                <div className="flex h-48 items-center justify-center text-muted">No rooms found.</div>
              ) : (
                floors.map((floor) => {
                  const floorRooms = groupedRooms[floor] || [];
                  if (!floorRooms.length) return null;
                  return (
                    <div key={floor} className="rounded-2xl border border-border bg-surface-2 p-3">
                      <div className="mb-3 flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-text-primary">Floor {floor}</h3>
                        <span className="text-xs text-muted">{floorRooms.length} rooms</span>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                        {floorRooms.map((room) => (
                          <button
                            key={room._id}
                            onClick={() => openRoom(room)}
                            className={`rounded-2xl border p-4 text-left transition ${STATUS_CLASSES[room.displayStatus || room.status] || "border-border bg-white"}`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-semibold text-white">{room.roomNumber}</p>
                              <StatusBadge status={room.displayStatus || room.status} />
                            </div>
                            <p className="mt-2 text-sm text-white/80">{room.type}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <aside className="rounded-2xl border border-border bg-white p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">Room details</h2>
                <p className="text-sm text-muted">Select any room to open details.</p>
              </div>
              {selectedRoom && (
                <button onClick={() => setSelectedRoom(null)} className="rounded-full p-2 text-muted hover:bg-surface-3">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {!selectedRoom ? (
              <div className="flex h-52 flex-col items-center justify-center text-muted">
                <BedDouble className="mb-3 h-8 w-8" />
                <p className="text-sm">Pick a room to view booking history and status actions.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl bg-surface-3 p-4">
                  <p className="text-sm text-muted">Room</p>
                  <p className="text-xl font-semibold text-text-primary">{selectedRoom.roomNumber}</p>
                  <p className="text-sm text-muted">{selectedRoom.type}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-muted">
                    <span>Status</span>
                    <StatusBadge status={selectedRoom.displayStatus || selectedRoom.status} />
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold text-text-primary uppercase">Room Status</span>
                    <div className="flex flex-wrap gap-2">
                      {STATUS_LABELS.map((status) => (
                        <button
                          key={status}
                          onClick={() => handleRoomStatus(status)}
                          disabled={saving}
                          className={`rounded-xl border border-border px-3 py-2 text-xs font-semibold transition hover:border-primary ${
                            (selectedRoom.status === status) ? "bg-primary text-white border-primary" : "text-text-primary"
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold text-text-primary uppercase mt-2">Cleaning Status</span>
                    <div className="flex flex-wrap gap-2">
                      {CLEANING_LABELS.map((status) => (
                        <button
                          key={status}
                          onClick={() => handleCleaningStatus(status)}
                          disabled={saving}
                          className={`rounded-xl border border-border px-3 py-2 text-xs font-semibold transition hover:border-sky-500 ${
                            (selectedRoom.cleaningStatus === status) ? "bg-sky-500 text-white border-sky-500" : "text-text-primary"
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <span className="text-xs font-semibold text-text-primary uppercase mt-2">Maintenance Status</span>
                    <div className="flex flex-wrap gap-2">
                      {MAINTENANCE_LABELS.map((status) => (
                        <button
                          key={status}
                          onClick={() => handleMaintenanceStatus(status)}
                          disabled={saving}
                          className={`rounded-xl border border-border px-3 py-2 text-xs font-semibold transition hover:border-amber-500 ${
                            (selectedRoom.maintenanceStatus === status) ? "bg-amber-500 text-white border-amber-500" : "text-text-primary"
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="rounded-2xl bg-surface-3 p-4">
                  <h3 className="text-sm font-semibold text-text-primary">Recent bookings</h3>
                  {historyLoading ? (
                    <div className="mt-4 text-sm text-muted">Loading history…</div>
                  ) : history.length === 0 ? (
                    <p className="mt-4 text-sm text-muted">No recent bookings for this room.</p>
                  ) : (
                    <div className="space-y-3">
                      {history.map((booking) => (
                        <div key={booking._id} className="rounded-2xl border border-border p-3">
                          <p className="font-semibold text-text-primary">{booking.guestSnapshot?.name || "Guest"}</p>
                          <p className="text-sm text-muted">{booking.status} · {booking.checkIn} → {booking.checkOut}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </AdminLayout>
  );
}
