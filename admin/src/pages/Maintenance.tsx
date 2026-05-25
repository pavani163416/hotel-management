import { useState, useEffect } from "react";
import { Wrench, Search, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import Topbar from "@/components/Topbar";
import { getAdminRooms, updateRoomMaintenanceStatus } from "@/services/api";
import StatusBadge from "@/components/StatusBadge";

export default function Maintenance() {
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

  const handleUpdate = async (id: string, maintenanceStatus: string) => {
    try {
      await updateRoomMaintenanceStatus(id, { maintenanceStatus });
      setRooms((prev) => prev.map((r) => r._id === id ? { ...r, maintenanceStatus } : r));
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = rooms.filter((r) => {
    const matchSearch = r.roomNumber?.toLowerCase().includes(search.toLowerCase()) || r.hotelStringId?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "All" || r.maintenanceStatus === filter || (!r.maintenanceStatus && filter === "None");
    return matchSearch && matchFilter;
  });

  return (
    <AdminLayout>
      <Topbar title="Maintenance" />
      <div className="p-6">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Maintenance Workflow</h1>
            <p className="text-sm text-muted">Manage room maintenance requests and track progress.</p>
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
              <option value="Requested">Requested</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="None">None</option>
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
                <th className="px-5 py-3">Maintenance Status</th>
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
                        room.maintenanceStatus === "Requested" ? "bg-red-100 text-red-700" :
                        room.maintenanceStatus === "In Progress" ? "bg-amber-100 text-amber-700" :
                        room.maintenanceStatus === "Completed" ? "bg-emerald-100 text-emerald-700" :
                        "bg-slate-100 text-slate-700"
                      }`}>
                        {room.maintenanceStatus === "Requested" ? <AlertTriangle className="w-3.5 h-3.5"/> :
                         room.maintenanceStatus === "In Progress" ? <Wrench className="w-3.5 h-3.5"/> :
                         room.maintenanceStatus === "Completed" ? <CheckCircle className="w-3.5 h-3.5"/> :
                         <CheckCircle className="w-3.5 h-3.5 text-muted"/>}
                        {room.maintenanceStatus || "None"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <select 
                        value={room.maintenanceStatus || "None"} 
                        onChange={(e) => handleUpdate(room._id, e.target.value)}
                        className="px-2 py-1 text-xs border border-border rounded outline-none focus:border-primary"
                      >
                        <option value="Requested">Request Maintenance</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Completed">Completed</option>
                        <option value="None">None</option>
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
