import { useState, useEffect } from "react";
import { Search, X, CheckCircle, Clock, AlertTriangle, PenTool } from "lucide-react";
import StatusBadge from "@/components/StatusBadge";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

type MaintenanceRequest = {
  _id: string;
  hotelId: { name: string; hotelId: string };
  roomId: { roomNumber: string; type: string } | null;
  issueType: string;
  description: string;
  reportedBy: string;
  status: string;
  priority: string;
  createdAt: string;
};

export default function MaintenanceTab() {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const res = await fetch(`${API}/maintenance`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setRequests(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch maintenance requests", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const res = await fetch(`${API}/maintenance/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setRequests((prev) =>
          prev.map((r) => (r._id === id ? { ...r, status: newStatus } : r))
        );
      }
    } catch (err) {
      console.error("Failed to update status", err);
    }
  };

  const filtered = requests.filter((r) => {
    const matchSearch = r.hotelId?.name.toLowerCase().includes(search.toLowerCase()) || r.description.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "All" || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border flex-wrap bg-white rounded-xl shadow-card">
        <div className="flex items-center gap-2 bg-surface-3 rounded-lg px-3 py-2 flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search issues or hotels..."
            className="bg-transparent text-sm outline-none text-text-primary placeholder:text-muted w-full"
          />
          {search && (
            <button onClick={() => setSearch("")}>
              <X className="w-3.5 h-3.5 text-muted" />
            </button>
          )}
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="text-sm border border-border rounded-lg px-3 py-2 outline-none text-text-secondary"
        >
          <option>All</option>
          <option>Pending</option>
          <option>In Progress</option>
          <option>Resolved</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-surface-2">
              <th className="text-left text-xs font-semibold text-muted uppercase tracking-wider px-5 py-3">Property / Room</th>
              <th className="text-left text-xs font-semibold text-muted uppercase tracking-wider px-5 py-3">Issue</th>
              <th className="text-left text-xs font-semibold text-muted uppercase tracking-wider px-5 py-3">Priority</th>
              <th className="text-left text-xs font-semibold text-muted uppercase tracking-wider px-5 py-3">Status</th>
              <th className="text-left text-xs font-semibold text-muted uppercase tracking-wider px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-muted text-sm">
                  No maintenance requests found.
                </td>
              </tr>
            ) : (
              filtered.map((req) => (
                <tr key={req._id} className="border-b border-border last:border-0 hover:bg-surface-2 transition-colors">
                  <td className="px-5 py-4">
                    <p className="text-sm font-semibold text-text-primary">{req.hotelId?.name}</p>
                    {req.roomId && (
                      <p className="text-xs text-muted font-semibold tracking-wider">Room {req.roomId.roomNumber}</p>
                    )}
                  </td>
                  <td className="px-5 py-4 max-w-xs">
                    <p className="text-sm font-semibold text-text-primary">{req.issueType}</p>
                    <p className="text-xs text-muted truncate" title={req.description}>{req.description}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                      req.priority === "Critical" ? "bg-danger-light text-danger" :
                      req.priority === "High" ? "bg-warning-light text-warning" : "bg-surface-3 text-muted"
                    }`}>
                      {req.priority}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={req.status} />
                  </td>
                  <td className="px-5 py-4">
                    <select
                      value={req.status}
                      onChange={(e) => updateStatus(req._id, e.target.value)}
                      className="text-xs border border-border rounded-lg px-2 py-1 outline-none text-text-secondary bg-transparent"
                    >
                      <option value="Pending">Pending</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Resolved">Resolved</option>
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
