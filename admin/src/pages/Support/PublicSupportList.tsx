import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, Filter, Loader2, ArrowRight } from "lucide-react";
import api from "@/services/api";
import { toast } from "sonner";
import { format } from "date-fns";

export default function PublicSupportList() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(() => {
    return new URLSearchParams(window.location.search).get("search") || "";
  });
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/public-support", {
        params: { search, status, priority }
      });
      setTickets(res.data || []);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to fetch tickets");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const querySearch = new URLSearchParams(window.location.search).get("search") || "";
    if (querySearch && querySearch !== search) {
      setSearch(querySearch);
    }
  }, [window.location.search]);

  useEffect(() => {
    fetchTickets();
  }, [search, status, priority]);

  const getStatusColor = (s: string) => {
    switch (s) {
      case "Pending": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "In Progress": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "Resolved": return "bg-green-500/10 text-green-500 border-green-500/20";
      case "Closed": return "bg-gray-500/10 text-gray-400 border-gray-500/20";
      default: return "bg-gray-500/10 text-gray-400 border-gray-500/20";
    }
  };

  const getPriorityColor = (p: string) => {
    switch (p) {
      case "High": return "text-red-500";
      case "Medium": return "text-yellow-500";
      case "Low": return "text-green-500";
      default: return "text-gray-500";
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Public Support Requests</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage public inquiries and login issues</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search by ID, Name or Email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-lg outline-none focus:border-primary text-sm"
          />
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-4 py-2 bg-card border border-border rounded-lg outline-none focus:border-primary text-sm min-w-[150px]"
        >
          <option value="">All Statuses</option>
          <option value="Pending">Pending</option>
          <option value="In Progress">In Progress</option>
          <option value="Resolved">Resolved</option>
          <option value="Closed">Closed</option>
        </select>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="px-4 py-2 bg-card border border-border rounded-lg outline-none focus:border-primary text-sm min-w-[150px]"
        >
          <option value="">All Priorities</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center border border-dashed border-border rounded-xl text-muted-foreground">
          <p>No support requests found</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-semibold">Ticket ID</th>
                  <th className="px-6 py-4 font-semibold">User Details</th>
                  <th className="px-6 py-4 font-semibold">Issue Type</th>
                  <th className="px-6 py-4 font-semibold">Priority</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Date</th>
                  <th className="px-6 py-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tickets.map(ticket => (
                  <tr key={ticket._id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-foreground">{ticket.ticketId}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{ticket.fullName}</div>
                      <div className="text-xs text-muted-foreground">{ticket.email}</div>
                    </td>
                    <td className="px-6 py-4">{ticket.issueType}</td>
                    <td className="px-6 py-4 font-medium">
                      <span className={getPriorityColor(ticket.priority)}>{ticket.priority}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(ticket.status)}`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {format(new Date(ticket.createdAt), "MMM d, yyyy")}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        to={`/public-support/${ticket._id}`}
                        className="inline-flex items-center gap-1.5 text-primary hover:text-primary/80 font-medium text-sm transition-colors"
                      >
                        View
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
