import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Plus, Edit2, Trash2, X, Download, ChevronDown, Loader2 } from "lucide-react";
import { BedDouble, CheckCircle, Wrench, DollarSign, Building2 } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import Topbar from "@/components/Topbar";
import PageHeader from "@/components/PageHeader";
import StatsCard from "@/components/StatsCard";
import StatusBadge from "@/components/StatusBadge";
import Modal from "@/components/Modal";

import { API } from "@/services/api";

type HotelOption = { hotelId: string; name: string };

type EmbeddedRoom = {
  id: string;
  name: string;
  description: string;
  price: number;
  capacity: number;
  bed: string;
  available: number;
  features: string[];
  floor: number;
  // derived for display
  status: "Available" | "Booked" | "Maintenance";
};

type FormState = {
  name: string;
  type: "Standard" | "Deluxe" | "Suite" | "Penthouse" | "Villa";
  price: string;
  capacity: string;
  bed: string;
  features: string;
  floor: string;
};

export default function Rooms() {
  const [hotels, setHotels] = useState<HotelOption[]>([]);
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
  const [selectedHotelId, setSelectedHotelId] = useState<string>("");
  const [rooms, setRooms] = useState<EmbeddedRoom[]>([]);
  const [loading, setLoading] = useState(false);

  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  useEffect(() => {
    const qParam = searchParams.get("q");
    if (qParam) {
      setSearch(qParam);
    } else {
      setSearch("");
    }
  }, [searchParams]);

  const [statusFilter, setStatusFilter] = useState("All");
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<EmbeddedRoom | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>({
    name: "", type: "Standard", price: "",
    capacity: "2", bed: "1 King Bed", features: "WiFi, AC", floor: "1",
  });

  // ── Fetch hotel list for dropdown ──────────────────────
  useEffect(() => {
    fetch(`${API}/hotels`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.data?.length) {
          const list: HotelOption[] = d.data.map((h: any) => ({ hotelId: h.hotelId, name: h.name }));
          setHotels(list);
          setSelectedHotelId(list[0]?.hotelId || "");
        }
      })
      .catch(() => {});
  }, []);

  // ── Fetch rooms from standalone Room collection whenever hotel changes ──
  const fetchHotelRooms = (hotelId: string) => {
    if (!hotelId) return;
    setLoading(true);
    fetch(`${API}/rooms?hotelStringId=${hotelId}`)
      .then((r) => r.json())
      .then((d) => {
        const raw: any[] = d?.data || [];
        setRooms(raw.map((r) => ({
          id:          r.roomNumber,
          name:        r.roomNumber,
          description: r.description || "",
          price:       r.pricePerNight || 0,
          capacity:    r.capacity || 2,
          bed:         r.bedType === "King" ? "1 King Bed" : r.bedType === "Queen" ? "1 Queen Bed" : r.bedType === "Twin" ? "2 Twin Beds" : r.bedType || "1 King Bed",
          available:   r.status === "Available" ? 1 : 0,
          features:    r.amenities && r.amenities.length > 0 ? r.amenities : [r.type],
          floor:       r.floor ?? 1,
          status:      r.status,
        })));
      })
      .catch(() => setRooms([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (selectedHotelId) fetchHotelRooms(selectedHotelId);
  }, [selectedHotelId]);

  const filtered = rooms.filter((r) => {
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    total:       rooms.length,
    available:   rooms.filter((r) => r.available > 0).length,
    unavailable: rooms.filter((r) => r.available === 0).length,
    maintenance: 0,
  };

  const selectedHotelName = hotels.find((h) => h.hotelId === selectedHotelId)?.name || "";

  const openAdd = () => {
    setEditTarget(null);
    setForm({ name: "", type: "Standard", price: "", capacity: "2", bed: "1 King Bed", features: "WiFi, AC", floor: "1" });
    setSubmitted(false);
    setAddOpen(true);
  };

  const openEdit = (r: EmbeddedRoom) => {
    setEditTarget(r);
    setForm({
      name:     r.name,
      type:     "Standard",
      price:    String(r.price),
      capacity: String(r.capacity),
      bed:      r.bed,
      features: r.features.join(", "),
      floor:    String(r.floor ?? 1),
    });
    setSubmitted(false);
    setAddOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHotelId || saving) return;
    setSaving(true);

    // Auto-generate room ID using hotel name initials + next room number
    const initials = (hotels.find((h) => h.hotelId === selectedHotelId)?.name || selectedHotelId)
      .replace(/[^a-zA-Z\s]/g, "")
      .split(/\s+/)
      .filter(Boolean)
      .map((w: string) => w[0].toLowerCase())
      .join("");
    const nextNum = 101 + rooms.length;
    const autoId = editTarget ? editTarget.id : `${initials}-${nextNum}`;

    // Map bed display name → bedType enum for standalone rooms collection
    const bedTypeMap: Record<string, string> = {
      "1 King Bed": "King", "2 King Beds": "King",
      "1 Queen Bed": "Queen",
      "2 Twin Beds": "Twin",
      "1 King Bed + Sofa": "King",
    };

    const features = form.features.split(",").map((f) => f.trim()).filter(Boolean);
    const floorNum = Math.max(1, Number(form.floor) || 1);

    // Payload for Hotel's embedded rooms array (user panel reads this)
    // addRoomToHotel on the backend also upserts into the standalone Room collection
    const embeddedPayload = {
      id:          autoId,
      name:        form.name,
      description: `${form.name} at ${selectedHotelName}`,
      price:       Number(form.price),
      capacity:    Number(form.capacity),
      bed:         form.bed,
      available:   1,
      features,
      floor:       floorNum,
      // Extra fields passed through so backend can build the standalone Room doc
      type:          form.type,
      bedType:       bedTypeMap[form.bed] || "King",
      pricePerNight: Number(form.price),
      hotelStringId: selectedHotelId,
    };

    const token = localStorage.getItem("luxe_admin_token");
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      if (editTarget) {
        // Update: delete old embedded entry then re-add updated one
        await fetch(`${API}/hotels/${selectedHotelId}/rooms/${editTarget.id}`, { method: "DELETE", headers });
        await fetch(`${API}/hotels/${selectedHotelId}/rooms`, {
          method: "POST", headers,
          body: JSON.stringify(embeddedPayload),
        });
      } else {
        // Add to Hotel's embedded rooms array
        // The backend (addRoomToHotel) also upserts into the standalone Room collection
        const hotelRes = await fetch(`${API}/hotels/${selectedHotelId}/rooms`, {
          method: "POST", headers,
          body: JSON.stringify(embeddedPayload),
        });
        if (!hotelRes.ok) {
          const err = await hotelRes.json();
          console.error("Room save failed:", err);
        }
      }
      fetchHotelRooms(selectedHotelId);
      setSubmitted(true);
      setTimeout(() => { setAddOpen(false); setSubmitted(false); }, 1000);
    } catch (err) {
      console.error("Room save error:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (roomId: string) => {
    if (!confirm("Remove this room?")) return;
    try {
      // Remove from Hotel's embedded array
      await fetch(`${API}/hotels/${selectedHotelId}/rooms/${roomId}`, { method: "DELETE" });
      // Also remove from standalone rooms collection by roomNumber
      const roomsRes = await fetch(`${API}/rooms`).then((r) => r.json());
      const match = roomsRes?.data?.find((r: any) => r.roomNumber === roomId);
      if (match) {
        await fetch(`${API}/rooms/${match._id}`, { method: "DELETE" }).catch(() => {});
      }
      fetchHotelRooms(selectedHotelId);
    } catch {
      setRooms((prev) => prev.filter((r) => r.id !== roomId));
    }
  };

  const updateHotelRoomAvailability = async (roomId: string, available: number) => {
    if (!selectedHotelId) return;
    try {
      const res = await fetch(`${API}/hotels/${selectedHotelId}/rooms/${roomId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ available }),
      });
      if (res.ok) {
        fetchHotelRooms(selectedHotelId);
      } else {
        const err = await res.json();
        console.error("Failed to update room availability:", err);
      }
    } catch (err) {
      console.error("Failed to update room availability:", err);
    }
  };

  const handleExport = () => {
    const rows = [
      ["Room ID", "Name", "Floor", "Price/Night", "Capacity", "Bed", "Available", "Features"],
      ...filtered.map((r) => [r.id, r.name, r.floor, r.price, r.capacity, r.bed, r.available, r.features.join("|")]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `rooms-${selectedHotelId}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <Topbar title="Rooms" />
      <div className="p-6">
        <PageHeader
          title="Room Management"
          subtitle="Select a hotel to view and manage its rooms."
          actions={
            <>
              <button onClick={handleExport}
                className="flex items-center gap-2 text-sm font-medium text-text-secondary border border-border rounded-lg px-4 py-2 hover:bg-surface-3 transition-colors">
                <Download className="w-4 h-4" /> Export
              </button>

            </>
          }
        />

        {/* ── Hotel Selector ── */}
        <div className="bg-white rounded-xl border border-border shadow-card p-4 mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm font-semibold text-text-secondary">
              <Building2 className="w-4 h-4 text-primary" />
              Select Hotel
            </div>
            <div className="relative">
              <select
                value={selectedHotelId}
                onChange={(e) => { setSelectedHotelId(e.target.value); setSearch(""); setStatusFilter("All"); }}
                className="appearance-none pl-4 pr-10 py-2.5 border border-border rounded-lg text-sm font-medium text-text-primary outline-none focus:border-primary bg-white min-w-[220px] cursor-pointer"
              >
                <option value="">— Pick a hotel —</option>
                {hotels.map((h) => (
                  <option key={h.hotelId} value={h.hotelId}>{h.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
            </div>
            {selectedHotelId && (
              <span className="text-xs text-muted ml-auto">
                {rooms.length} room{rooms.length !== 1 ? "s" : ""} in {selectedHotelName}
              </span>
            )}
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatsCard title="Total Rooms"    value={stats.total}       icon={<BedDouble    className="w-5 h-5 text-primary" />} iconBg="bg-primary-light" />
          <StatsCard title="Available"      value={stats.available}   change="Ready" trend="up" icon={<CheckCircle className="w-5 h-5 text-success" />} iconBg="bg-success-light" />
          <StatsCard title="Unavailable"   value={stats.unavailable} icon={<DollarSign   className="w-5 h-5 text-warning" />} iconBg="bg-warning-light" />
          <StatsCard title="Maintenance"   value={stats.maintenance} icon={<Wrench       className="w-5 h-5 text-danger"  />} iconBg="bg-danger-light" />
        </div>

        {/* ── Rooms Table ── */}
        <div className="bg-white rounded-xl border border-border shadow-card">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border flex-wrap">
            <div className="flex items-center gap-2 bg-surface-3 rounded-lg px-3 py-2 flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-muted" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by room ID or name..."
                className="bg-transparent text-sm outline-none w-full placeholder:text-muted" />
              {search && <button onClick={() => setSearch("")}><X className="w-3.5 h-3.5 text-muted" /></button>}
            </div>
            {(["All", "Available", "Maintenance"] as const).map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${statusFilter === s ? "bg-primary text-white" : "bg-surface-3 text-muted hover:bg-surface-2"}`}>
                {s}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {["#", "Name", "Floor", "Price/Night", "Capacity", "Bed", "Available", "Features"].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-muted uppercase tracking-wider px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!selectedHotelId ? (
                  <tr><td colSpan={9} className="px-5 py-16 text-center text-muted text-sm">Select a hotel to view its rooms.</td></tr>
                ) : loading ? (
                  <tr><td colSpan={9} className="px-5 py-16 text-center text-muted text-sm">Loading rooms...</td></tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-5 py-16 text-center">
                      <BedDouble className="w-10 h-10 text-muted/30 mx-auto mb-3" />
                      <p className="text-sm text-muted">No rooms found for {selectedHotelName}.</p>
                      <p className="text-xs text-muted mt-1">Click "Add Room" to add the first room.</p>
                    </td>
                  </tr>
                ) : filtered.map((r, idx) => (
                  <tr key={`${r.id}-${idx}`} className="border-b border-border last:border-0 hover:bg-surface-2 transition-colors">
                    <td className="px-5 py-3.5 text-sm text-muted w-10">{idx + 1}</td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-text-primary">{r.name}</td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-semibold bg-primary-light text-primary px-2 py-1 rounded-full">
                        Floor {r.floor}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-sm font-semibold text-text-primary">${r.price}</td>
                    <td className="px-5 py-3.5 text-sm text-text-secondary">{r.capacity}</td>
                    <td className="px-5 py-3.5 text-sm text-text-secondary">{r.bed}</td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-5 py-3.5 text-xs text-text-secondary">{r.features.join(", ")}</td>
                    {/* Actions removed (controlled by inventory) */}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-5 py-3 border-t border-border">
            <p className="text-xs text-muted">Showing {filtered.length} of {rooms.length} rooms</p>
          </div>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <Modal isOpen={addOpen} onClose={() => { setAddOpen(false); setSubmitted(false); }} title={editTarget ? "Edit Room" : `Add Room — ${selectedHotelName}`}>
        {submitted ? (
          <div className="flex flex-col items-center py-8 gap-3">
            <div className="w-14 h-14 bg-success-light rounded-full grid place-items-center">
              <span className="text-success text-3xl">✓</span>
            </div>
            <p className="font-semibold text-text-primary">{editTarget ? "Room Updated!" : "Room Added!"}</p>
            <p className="text-xs text-muted">User panel updated in real time.</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="flex items-center gap-2 px-3 py-2 bg-primary-light rounded-lg">
              <Building2 className="w-4 h-4 text-primary shrink-0" />
              <span className="text-xs font-semibold text-primary">Hotel: {selectedHotelName}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">Room Name *</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Deluxe King Room"
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">Room Type *</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as FormState["type"] })}
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm outline-none focus:border-primary">
                  {activeRoomTypes.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">Price/Night ($) *</label>
                <input required type="number" min="1" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="480"
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">Capacity</label>
                <input type="number" min="1" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                  placeholder="2"
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm outline-none focus:border-primary" />
                <p className="text-[10px] text-muted mt-1">Max guests allowed. Users cannot add more guests than this during booking.</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">Bed Type</label>
                <select value={form.bed} onChange={(e) => setForm({ ...form, bed: e.target.value })}
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm outline-none focus:border-primary">
                  {["1 King Bed", "1 Queen Bed", "2 Twin Beds", "1 King Bed + Sofa", "2 King Beds"].map((b) => <option key={b}>{b}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">Features (comma separated)</label>
                <input value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })}
                  placeholder="WiFi, AC, Mini Bar"
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">Floor Number *</label>
                <input required type="number" min="1" max="100" value={form.floor}
                  onChange={(e) => setForm({ ...form, floor: e.target.value })}
                  placeholder="e.g. 3"
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm outline-none focus:border-primary" />
                <p className="text-[10px] text-muted mt-1">Used in the Floor Map view for managers.</p>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setAddOpen(false)}
                className="flex-1 py-2.5 border border-border rounded-lg text-sm font-medium text-text-secondary hover:bg-surface-3 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {editTarget ? "Updating..." : "Adding..."}
                  </>
                ) : (
                  editTarget ? "Update Room" : "Add Room"
                )}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </AdminLayout>
  );
}
