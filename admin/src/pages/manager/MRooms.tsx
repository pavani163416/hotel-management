import { useEffect, useState, useCallback } from "react";
import {
  Plus, Search, LayoutGrid, List, Edit2, Trash2,
  BedDouble, Users, DollarSign, X, Check, AlertCircle,
} from "lucide-react";
import ManagerLayout from "@/components/ManagerLayout";
import StatusBadge from "@/components/StatusBadge";
import Modal from "@/components/Modal";
import { getManagerRooms, createManagerRoom, updateManagerRoom, deleteManagerRoom } from "@/services/api";
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
  description?: string;
};

const ROOM_TYPES = ["Standard", "Deluxe", "Suite", "Penthouse", "Villa"];
const BED_TYPES  = ["Single", "Double", "Queen", "King", "Twin"];
const STATUSES   = ["Available", "Booked", "Maintenance"];

const emptyForm = {
  roomNumber: "", type: "Deluxe", pricePerNight: "", capacity: "2",
  bedType: "King", floor: "", status: "Available", description: "", amenities: "",
};

export default function Rooms() {
  const [rooms, setRooms]         = useState<Room[]>([]);
  const [roomTypes, setRoomTypes] = useState<string[]>([]);

  useEffect(() => {
    fetch(`${API}/room-types`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.data?.length) {
          const codes = d.data
            .filter((rt: any) => rt.active)
            .map((rt: any) => {
              const code = rt.code || "";
              return code.charAt(0).toUpperCase() + code.slice(1);
            });
          if (codes.length) setRoomTypes(codes);
        }
      })
      .catch(() => {});
  }, []);

  const activeRoomTypes = roomTypes.length ? roomTypes : ["Standard", "Deluxe", "Suite", "Penthouse", "Villa"];
  const [loading, setLoading]     = useState(true);
  const [view, setView]           = useState<"grid" | "list">("grid");
  const [search, setSearch]       = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterType, setFilterType]     = useState("All");

  const [showAdd, setShowAdd]     = useState(false);
  const [editRoom, setEditRoom]   = useState<Room | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Room | null>(null);
  const [form, setForm]           = useState({ ...emptyForm });
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res: any = await getManagerRooms();
      setRooms(res?.data || []);
    } catch { setRooms([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useSocket("roomStatusUpdate", useCallback(() => load(), [load]));

  const filtered = rooms.filter((r) => {
    const matchSearch = !search ||
      r.roomNumber.toLowerCase().includes(search.toLowerCase()) ||
      r.type.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "All" || r.status === filterStatus;
    const matchType   = filterType   === "All" || r.type   === filterType;
    return matchSearch && matchStatus && matchType;
  });

  const openEdit = (room: Room) => {
    setEditRoom(room);
    setForm({
      roomNumber:    room.roomNumber,
      type:          room.type,
      pricePerNight: String(room.pricePerNight),
      capacity:      String(room.capacity),
      bedType:       room.bedType || "King",
      floor:         room.floor || "",
      status:        room.status,
      description:   room.description || "",
      amenities:     (room.amenities || []).join(", "),
    });
    setError("");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setSaving(true);
    const payload = {
      roomNumber:    form.roomNumber,
      type:          form.type,
      pricePerNight: Number(form.pricePerNight),
      capacity:      Number(form.capacity),
      bedType:       form.bedType,
      floor:         form.floor,
      status:        form.status,
      description:   form.description,
      amenities:     form.amenities.split(",").map((s) => s.trim()).filter(Boolean),
    };
    try {
      if (editRoom) {
        await updateManagerRoom(editRoom._id, payload);
        setSuccess("Room updated successfully.");
      } else {
        await createManagerRoom(payload);
        setSuccess("Room created successfully.");
      }
      await load();
      setTimeout(() => {
        setShowAdd(false); setEditRoom(null);
        setForm({ ...emptyForm }); setSuccess("");
      }, 1000);
    } catch (err: any) {
      setError(err.message || "Failed to save room.");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await deleteManagerRoom(deleteTarget._id);
      await load();
      setDeleteTarget(null);
    } catch (err: any) {
      setError(err.message || "Failed to delete room.");
    }
    setSaving(false);
  };

  const handleStatusChange = async (room: Room, status: string) => {
    try {
      await updateManagerRoom(room._id, { status });
      setRooms((prev) => prev.map((r) => r._id === room._id ? { ...r, status: status as any } : r));
    } catch { /* silent */ }
  };

  return (
    <ManagerLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-bright">Rooms</h1>
          <p className="text-sm text-dim mt-0.5">{rooms.length} total · {rooms.filter((r) => r.status === "Available").length} available</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dim" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search rooms..."
            className="w-full pl-9 pr-4 py-2 border border-white/10 rounded-xl text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/10 bg-white/5 text-bright placeholder:text-dim"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="glass-select rounded-xl px-4 py-2 text-sm outline-none"
        >
          <option value="All">All Status</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="glass-select rounded-xl px-4 py-2 text-sm outline-none"
        >
          <option value="All">All Types</option>
          {activeRoomTypes.map((t) => <option key={t}>{t}</option>)}
        </select>
        <div className="flex items-center border border-white/10 rounded-xl overflow-hidden bg-white/5">
          <button
            onClick={() => setView("grid")}
            className={`p-2.5 transition-all ${view === "grid" ? "bg-primary text-white" : "text-dim hover:text-bright hover:bg-white/5"}`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setView("list")}
            className={`p-2.5 transition-all ${view === "list" ? "bg-primary text-white" : "text-dim hover:text-bright hover:bg-white/5"}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-7 h-7 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-2xl p-16 text-center">
          <BedDouble className="w-12 h-12 text-white/10 mx-auto mb-4" />
          <p className="text-sm text-dim">No rooms found</p>
        </div>
      ) : view === "grid" ? (
        /* Grid View */
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((room) => (
            <div
              key={room._id}
              className="glass-card rounded-2xl p-5 hover:shadow-2xl transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-bright text-lg">#{room.roomNumber}</p>
                  <p className="text-xs text-dim">{room.type}</p>
                </div>
                <StatusBadge status={room.status} />
              </div>

              <div className="space-y-2 mb-5">
                <div className="flex items-center gap-2.5 text-xs text-soft">
                  <DollarSign className="w-4 h-4 text-gold" />
                  <span className="font-bold text-bright text-sm">${room.pricePerNight}</span>
                  <span className="text-dim">/ night</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-soft">
                  <Users className="w-4 h-4 text-gold" />
                  <span>Capacity: {room.capacity} guests</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-soft">
                  <BedDouble className="w-4 h-4 text-gold" />
                  <span>{room.bedType || "King"} bed</span>
                </div>
              </div>

              {/* Quick status change */}
              <select
                value={room.status}
                onChange={(e) => handleStatusChange(room, e.target.value)}
                className="w-full glass-select rounded-xl px-3 py-2 text-xs outline-none mb-4"
              >
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>

              <div className="flex gap-2">
                <button
                  onClick={() => openEdit(room)}
                  className="flex-1 flex items-center justify-center gap-2 text-xs font-bold text-soft bg-white/5 border border-white/10 rounded-xl py-2 hover:bg-white/10 hover:text-bright transition-all"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  onClick={() => setDeleteTarget(room)}
                  className="w-9 h-9 flex items-center justify-center text-ruby bg-ruby/5 border border-ruby/10 rounded-xl hover:bg-ruby hover:text-white transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="glass-card rounded-2xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5 bg-white/5">
                {["Room", "Type", "Price/Night", "Capacity", "Bed", "Status"].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-dim uppercase tracking-wider px-5 py-4 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((room) => (
                <tr key={room._id} className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                  <td className="px-5 py-4 font-bold text-bright text-sm">#{room.roomNumber}</td>
                  <td className="px-5 py-4 text-sm text-soft">{room.type}</td>
                  <td className="px-5 py-4 text-sm font-bold text-bright">${room.pricePerNight}</td>
                  <td className="px-5 py-4 text-sm text-soft">{room.capacity} guests</td>
                  <td className="px-5 py-4 text-sm text-soft">{room.bedType || "King"}</td>
                  <td className="px-5 py-4">
                    <select
                      value={room.status}
                      onChange={(e) => handleStatusChange(room, e.target.value)}
                      className="glass-select rounded-lg px-2 py-1 text-xs outline-none"
                    >
                      {STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                    {/* Actions removed (controlled by inventory) */}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Modal */}
      <Modal
        isOpen={showAdd || !!editRoom}
        onClose={() => { setShowAdd(false); setEditRoom(null); setError(""); setSuccess(""); }}
        title={editRoom ? `Edit Room #${editRoom.roomNumber}` : "Add New Room"}
        size="md"
      >
        {success ? (
          <div className="flex flex-col items-center py-8 gap-3">
            <div className="w-12 h-12 bg-emerald/10 rounded-full grid place-items-center">
              <Check className="w-6 h-6 text-emerald" />
            </div>
            <p className="font-semibold text-bright">{success}</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-dim uppercase tracking-wider mb-1.5">Room Number *</label>
                <input required value={form.roomNumber} onChange={(e) => setForm({ ...form, roomNumber: e.target.value })}
                  placeholder="e.g. 101"
                  className="w-full border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/10 bg-white/5 text-bright" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-dim uppercase tracking-wider mb-1.5">Type *</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full glass-select rounded-xl px-4 py-2.5 text-sm outline-none">
                  {activeRoomTypes.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-dim uppercase tracking-wider mb-1.5">Price / Night ($) *</label>
                <input required type="number" min="1" value={form.pricePerNight}
                  onChange={(e) => setForm({ ...form, pricePerNight: e.target.value })}
                  placeholder="e.g. 250"
                  className="w-full border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/10 bg-white/5 text-bright" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-dim uppercase tracking-wider mb-1.5">Capacity *</label>
                <input required type="number" min="1" max="20" value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                  className="w-full border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/10 bg-white/5 text-bright" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-dim uppercase tracking-wider mb-1.5">Bed Type</label>
                <select value={form.bedType} onChange={(e) => setForm({ ...form, bedType: e.target.value })}
                  className="w-full glass-select rounded-xl px-4 py-2.5 text-sm outline-none">
                  {BED_TYPES.map((b) => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-dim uppercase tracking-wider mb-1.5">Floor</label>
                <input value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })}
                  placeholder="e.g. 3"
                  className="w-full border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/10 bg-white/5 text-bright" />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-bold text-dim uppercase tracking-wider mb-1.5">Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full glass-select rounded-xl px-4 py-2.5 text-sm outline-none">
                  {STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-bold text-dim uppercase tracking-wider mb-1.5">Amenities (comma-separated)</label>
                <input value={form.amenities} onChange={(e) => setForm({ ...form, amenities: e.target.value })}
                  placeholder="WiFi, AC, Mini Bar, TV"
                  className="w-full border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/10 bg-white/5 text-bright" />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-bold text-dim uppercase tracking-wider mb-1.5">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={2} placeholder="Brief room description..."
                  className="w-full border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/10 bg-white/5 text-bright resize-none" />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-ruby/10 text-ruby text-sm px-4 py-2.5 rounded-xl border border-ruby/20">
                <AlertCircle className="w-4 h-4 shrink-0" /> {error}
              </div>
            )}

            <button type="submit" disabled={saving}
              className="w-full bg-primary text-white py-3 rounded-xl font-bold text-sm hover:bg-primary-dark transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-primary/20">
              {saving
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : editRoom ? "Save Changes" : "Create Room"
              }
            </button>
          </form>
        )}
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Room" size="sm">
        <div className="text-center py-2">
          <div className="w-12 h-12 bg-ruby/10 rounded-full grid place-items-center mx-auto mb-4 border border-ruby/20">
            <Trash2 className="w-6 h-6 text-ruby" />
          </div>
          <p className="font-bold text-bright mb-1">Delete Room #{deleteTarget?.roomNumber}?</p>
          <p className="text-sm text-dim mb-6">This action cannot be undone.</p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteTarget(null)}
              className="flex-1 border border-white/10 rounded-xl py-2.5 text-sm font-bold text-dim hover:text-bright hover:bg-white/5 transition-all">
              Cancel
            </button>
            <button onClick={handleDelete} disabled={saving}
              className="flex-1 bg-ruby text-white rounded-xl py-2.5 text-sm font-bold hover:bg-red-700 transition-all disabled:opacity-60 shadow-lg shadow-ruby/20">
              {saving ? "Deleting..." : "Delete"}
            </button>
          </div>
        </div>
      </Modal>
    </ManagerLayout>
  );
}
