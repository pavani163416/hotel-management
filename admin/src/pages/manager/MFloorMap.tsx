import { useEffect, useState, useCallback } from "react";
import { BedDouble, User, Phone, Calendar, Wrench } from "lucide-react";
import ManagerLayout from "@/components/ManagerLayout";
import Drawer from "@/components/Drawer";
import StatusBadge from "@/components/StatusBadge";
import { getManagerRooms, getManagerBookings, updateManagerRoom } from "@/services/api";
import { useSocket } from "@/hooks/useSocket";

type Room = {
  _id: string;
  roomNumber: string;
  type: string;
  pricePerNight: number;
  capacity: number;
  bedType: string;
  floor?: string;
  status: "Available" | "Booked" | "Maintenance";
  amenities?: string[];
};

type Booking = {
  _id: string;
  guestSnapshot: { name: string; email: string; phone?: string };
  room?: { roomNumber?: string };
  checkIn: string;
  checkOut: string;
  status: string;
};

const STATUS_COLORS: Record<string, string> = {
  Available:   "bg-success hover:bg-success/90",
  Booked:      "bg-danger hover:bg-danger/90",
  Maintenance: "bg-warning hover:bg-warning/90",
};

const STATUS_LABELS: Record<string, string> = {
  Available:   "Available",
  Booked:      "Occupied",
  Maintenance: "Maintenance",
};

export default function FloorMap() {
  const [rooms, setRooms]       = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<Room | null>(null);
  const [filterFloor, setFilterFloor] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");

  const load = useCallback(async () => {
    try {
      const [rR, bR]: any[] = await Promise.allSettled([getManagerRooms(), getManagerBookings()]);
      if (rR.status === "fulfilled") setRooms(rR.value?.data || []);
      if (bR.status === "fulfilled") setBookings(bR.value?.data || []);
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useSocket("newBooking", useCallback(() => load(), [load]));
  useSocket("roomStatusUpdate", useCallback(() => load(), [load]));

  const floors = Array.from(new Set(rooms.map((r) => r.floor || "1"))).sort();
  const filtered = rooms.filter((r) => {
    const matchFloor  = filterFloor  === "All" || (r.floor || "1") === filterFloor;
    const matchStatus = filterStatus === "All" || r.status === filterStatus;
    return matchFloor && matchStatus;
  });

  const groupedByFloor = floors.reduce((acc, floor) => {
    acc[floor] = filtered.filter((r) => (r.floor || "1") === floor);
    return acc;
  }, {} as Record<string, Room[]>);

  const currentBooking = selected
    ? bookings.find((b) => b.room?.roomNumber === selected.roomNumber && b.status === "Confirmed")
    : null;

  const handleStatusChange = async (status: string) => {
    if (!selected) return;
    try {
      await updateManagerRoom(selected._id, { status });
      setRooms((prev) => prev.map((r) => r._id === selected._id ? { ...r, status: status as any } : r));
      setSelected((prev) => prev ? { ...prev, status: status as any } : null);
    } catch { /* silent */ }
  };

  const available   = rooms.filter((r) => r.status === "Available").length;
  const booked      = rooms.filter((r) => r.status === "Booked").length;
  const maintenance = rooms.filter((r) => r.status === "Maintenance").length;

  return (
    <ManagerLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-bright">Live Floor Map</h1>
          <p className="text-sm text-dim mt-0.5">Interactive room status visualization</p>
        </div>
      </div>

      {/* Legend + Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-4">
          {[
            { label: "Available",   count: available,   color: "bg-success" },
            { label: "Occupied",    count: booked,      color: "bg-danger" },
            { label: "Maintenance", count: maintenance, color: "bg-warning" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-xs">
              <span className={`w-3 h-3 rounded ${item.color}`} />
              <span className="text-soft">{item.label}</span>
              <span className="font-bold text-bright">({item.count})</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <select value={filterFloor} onChange={(e) => setFilterFloor(e.target.value)}
            className="glass-select border border-white/10 rounded-xl px-3 py-2 text-sm outline-none">
            <option value="All">All Floors</option>
            {floors.map((f) => <option key={f} value={f}>Floor {f}</option>)}
          </select>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="glass-select border border-white/10 rounded-xl px-3 py-2 text-sm outline-none">
            <option value="All">All Status</option>
            <option>Available</option>
            <option>Booked</option>
            <option>Maintenance</option>
          </select>
        </div>
      </div>

      {/* Floor Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {floors.map((floor) => {
            const floorRooms = groupedByFloor[floor] || [];
            if (floorRooms.length === 0) return null;
            return (
              <div key={floor} className="glass-card rounded-2xl border border-white/10 p-5">
                <h3 className="font-semibold text-bright mb-4">Floor {floor}</h3>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2">
                  {floorRooms.map((room) => (
                    <button
                      key={room._id}
                      onClick={() => setSelected(room)}
                      className={`relative aspect-square rounded-xl flex flex-col items-center justify-center
                        text-white font-semibold text-xs transition-all shadow-sm
                        ${STATUS_COLORS[room.status] || "bg-white/10"}
                        ${selected?._id === room._id ? "ring-2 ring-gold scale-105" : ""}
                      `}
                    >
                      <BedDouble className="w-4 h-4 mb-0.5" />
                      <span>{room.roomNumber}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Room Detail Drawer */}
      <Drawer
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        title={`Room #${selected?.roomNumber || ""}`}
        width="w-[420px]"
      >
        {selected && (
          <div className="space-y-5">
            {/* Status badge */}
            <div className="flex items-center justify-between">
              <StatusBadge status={STATUS_LABELS[selected.status]} />
              <span className="text-xs text-muted">Floor {selected.floor || "1"}</span>
            </div>

            {/* Room Info */}
            <section>
              <h3 className="text-xs font-semibold text-dim uppercase tracking-wider mb-3">Room Details</h3>
              <div className="rounded-xl p-4 space-y-2 text-sm"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex items-center justify-between">
                  <span className="text-soft">Type</span>
                  <span className="font-semibold text-bright">{selected.type}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-soft">Price / Night</span>
                  <span className="font-semibold text-bright">${selected.pricePerNight}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-soft">Capacity</span>
                  <span className="font-semibold text-bright">{selected.capacity} guests</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-soft">Bed Type</span>
                  <span className="font-semibold text-bright">{selected.bedType || "King"}</span>
                </div>
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

            {/* Current Guest (if booked) */}
            {selected.status === "Booked" && currentBooking && (
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
                      <p className="font-semibold text-bright">{currentBooking.guestSnapshot.name}</p>
                      <p className="text-xs text-dim">{currentBooking.guestSnapshot.email}</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-xs">
                    {currentBooking.guestSnapshot.phone && (
                      <div className="flex items-center gap-2 text-soft">
                        <Phone className="w-3.5 h-3.5 text-gold" />
                        {currentBooking.guestSnapshot.phone}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-soft">
                      <Calendar className="w-3.5 h-3.5 text-gold" />
                      {new Date(currentBooking.checkIn).toLocaleDateString()} → {new Date(currentBooking.checkOut).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Quick Actions */}
            <section>
              <h3 className="text-xs font-semibold text-dim uppercase tracking-wider mb-3">Quick Actions</h3>
              <div className="space-y-2">
                {selected.status === "Available" && (
                  <button onClick={() => handleStatusChange("Maintenance")}
                    className="w-full flex items-center justify-center gap-2 border border-warning/30 text-warning rounded-xl py-2.5 text-sm font-semibold hover:bg-warning/10 transition-colors">
                    <Wrench className="w-4 h-4" /> Mark for Maintenance
                  </button>
                )}
                {selected.status === "Maintenance" && (
                  <button onClick={() => handleStatusChange("Available")}
                    className="w-full flex items-center justify-center gap-2 bg-success text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-green-700 transition-colors">
                    Mark Available
                  </button>
                )}
                {selected.status === "Booked" && (
                  <button onClick={() => handleStatusChange("Available")}
                    className="w-full flex items-center justify-center gap-2 border border-white/10 text-soft rounded-xl py-2.5 text-sm font-semibold hover:bg-white/5 hover:text-bright transition-colors">
                    Force Check-out
                  </button>
                )}
              </div>
            </section>
          </div>
        )}
      </Drawer>
    </ManagerLayout>
  );
}
