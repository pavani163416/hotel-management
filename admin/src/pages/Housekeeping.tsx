import { useState, useEffect } from "react";
import { Sparkles, Search, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import Topbar from "@/components/Topbar";
import { getAdminRooms, updateRoomCleaningStatus } from "@/services/api";
import StatusBadge from "@/components/StatusBadge";

export default function Housekeeping() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const fetchRooms = async () => {
    setLoading(true);
    try {
      const res: any = await getAdminRooms();
      setRooms(res?.data || []);
    } catch {
      setRooms([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleUpdate = async (id: string, cleaningStatus: string) => {
    try {
      await updateRoomCleaningStatus(id, { cleaningStatus });
      setRooms((prev) => prev.map((r) => r._id === id ? { ...r, cleaningStatus } : r));
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = rooms.filter((r) => {
    const matchSearch = r.roomNumber?.toLowerCase().includes(search.toLowerCase()) || r.hotelStringId?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "All" || r.cleaningStatus === filter || (!r.cleaningStatus && filter === "Clean");
    return matchSearch && matchFilter;
  });

  return (
    <AdminLayout>
      <Topbar title="Housekeeping" />
      <div className="p-6">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Housekeeping Workflow</h1>
            <p className="text-sm text-muted">Manage and update room cleaning statuses across properties.</p>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted pointer-events-none" />
              <input 
                placeholder="Search rooms..." 
                value={search} onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 border border-border rounded-lg text-sm focus:border-primary outline-none"
              />
            </div>
            <select value={filter} onChange={(e) => setFilter(e.target.value)} className="px-3 py-2 border border-border rounded-lg text-sm outline-none focus:border-primary">
              <option value="All">All Statuses</option>
              <option value="Dirty">Dirty</option>
              <option value="In Progress">In Progress</option>
              <option value="Inspected">Inspected</option>
              <option value="Clean">Clean</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-border overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-2 text-muted border-b border-border uppercase text-xs">
              <tr>
                <th className="px-5 py-3">Room</th>
                <th className="px-5 py-3">Property</th>
                <th className="px-5 py-3">Occupancy Status</th>
                <th className="px-5 py-3">Cleaning Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-muted">Loading rooms...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-5 py-10 text-center text-muted">No rooms match criteria.</td></tr>
              ) : (
                filtered.map((room) => (
                  <tr key={room._id} className="border-b border-border last:border-0 hover:bg-surface-2 transition">
                    <td className="px-5 py-3 font-semibold text-text-primary">{room.roomNumber}</td>
                    <td className="px-5 py-3 text-text-secondary">{room.hotelStringId}</td>
                    <td className="px-5 py-3"><StatusBadge status={room.status} /></td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        room.cleaningStatus === "Dirty" ? "bg-red-100 text-red-700" :
                        room.cleaningStatus === "In Progress" ? "bg-amber-100 text-amber-700" :
                        room.cleaningStatus === "Inspected" ? "bg-purple-100 text-purple-700" :
                        "bg-emerald-100 text-emerald-700"
                      }`}>
                        {room.cleaningStatus === "Dirty" ? <AlertTriangle className="w-3.5 h-3.5"/> :
                         room.cleaningStatus === "In Progress" ? <Clock className="w-3.5 h-3.5"/> :
                         room.cleaningStatus === "Inspected" ? <Search className="w-3.5 h-3.5"/> :
                         <CheckCircle className="w-3.5 h-3.5"/>}
                        {room.cleaningStatus || "Clean"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <select 
                        value={room.cleaningStatus || "Clean"} 
                        onChange={(e) => handleUpdate(room._id, e.target.value)}
                        className="px-2 py-1 text-xs border border-border rounded outline-none focus:border-primary"
                      >
                        <option value="Dirty">Mark Dirty</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Inspected">Inspected</option>
                        <option value="Clean">Mark Clean</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  );
}
