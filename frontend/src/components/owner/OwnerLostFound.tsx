import { useState, useEffect } from "react";
import { Loader2, PackageSearch, Filter, AlertCircle, Eye } from "lucide-react";
import { toast } from "sonner";
import dayjs from "dayjs";
import { API } from "@/services/api";

interface LostFoundEntry {
  _id: string;
  hotelId: string;
  type: string;
  itemName: string;
  category: string;
  description: string;
  dateLostFound: string;
  locationDetails: string;
  status: string;
  adminNotes: string;
  userId: { _id: string; name: string; email: string; phone: string };
  createdAt: string;
}

export default function OwnerLostFound() {
  const [reports, setReports] = useState<LostFoundEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("Reported");
  const [selectedReport, setSelectedReport] = useState<LostFoundEntry | null>(null);
  const [statusUpdate, setStatusUpdate] = useState("");
  const [adminNotesUpdate, setAdminNotesUpdate] = useState("");
  const [updating, setUpdating] = useState(false);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const hotelsRes = await API.get("/hotels/my-properties");
      if (hotelsRes.data.success && hotelsRes.data.data.length > 0) {
        const hotelId = hotelsRes.data.data[0].hotelId;
        
        let query = `?status=${statusFilter}`;
        if (typeFilter) query += `&type=${typeFilter}`;

        const res = await API.get(`/lost-found/hotel/${hotelId}${query}`);
        setReports(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch reports", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [statusFilter, typeFilter]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport) return;
    setUpdating(true);
    try {
      const res = await API.put(`/lost-found/${selectedReport._id}/status`, {
        status: statusUpdate,
        adminNotes: adminNotesUpdate
      });
      if (res.data.success) {
        toast.success("Report updated successfully");
        fetchReports();
        setSelectedReport(null);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update report");
    } finally {
      setUpdating(false);
    }
  };

  if (loading && reports.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
            <PackageSearch className="w-6 h-6 text-accent" />
            Lost & Found
          </h2>
          <p className="text-muted-foreground text-sm">Manage guest reports of lost or found items.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-surface-2 p-1 rounded-lg border border-border">
            <Filter className="w-4 h-4 text-muted-foreground ml-2" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-transparent border-none outline-none text-sm font-medium pr-2 text-primary cursor-pointer"
            >
              <option value="">All Types</option>
              <option value="Lost">Lost</option>
              <option value="Found">Found</option>
            </select>
          </div>
          <div className="flex items-center gap-2 bg-surface-2 p-1 rounded-lg border border-border">
            <Filter className="w-4 h-4 text-muted-foreground ml-2" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent border-none outline-none text-sm font-medium pr-2 text-primary cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="Reported">Reported</option>
              <option value="Matched">Matched</option>
              <option value="Returned">Returned</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-2/50 text-muted-foreground text-xs uppercase tracking-wider">
                <th className="p-4 font-semibold">Type</th>
                <th className="p-4 font-semibold">Item & Category</th>
                <th className="p-4 font-semibold">Guest</th>
                <th className="p-4 font-semibold">Date & Location</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-border">
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No lost & found reports match your filters.
                  </td>
                </tr>
              ) : (
                reports.map((r) => (
                  <tr key={r._id} className="hover:bg-surface-1/50 transition-colors">
                    <td className="p-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-bold uppercase rounded-md border ${
                        r.type === 'Lost' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {r.type}
                      </span>
                    </td>
                    <td className="p-4">
                      <p className="font-semibold text-primary">{r.itemName}</p>
                      <p className="text-xs text-muted-foreground">{r.category}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-medium">{r.userId?.name}</p>
                      <p className="text-xs text-muted-foreground">{r.userId?.email}</p>
                      <p className="text-xs text-muted-foreground">{r.userId?.phone}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-medium">{dayjs(r.dateLostFound).format("MMM D, YYYY")}</p>
                      <p className="text-xs text-muted-foreground">{r.locationDetails}</p>
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                        r.status === "Reported" ? "bg-gray-100 text-gray-800" :
                        r.status === "Matched" ? "bg-amber-100 text-amber-800" :
                        r.status === "Returned" ? "bg-green-100 text-green-800" :
                        "bg-red-100 text-red-800"
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedReport(r);
                          setStatusUpdate(r.status);
                          setAdminNotesUpdate(r.adminNotes || "");
                        }}
                        className="inline-flex items-center gap-1.5 text-primary hover:text-accent font-medium transition-colors"
                      >
                        <Eye className="w-4 h-4" /> View/Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden border border-border">
            <div className="p-4 border-b border-border flex justify-between items-center bg-surface-1">
              <h3 className="font-bold text-primary flex items-center gap-2 text-lg">
                Update Report <span className="font-mono text-muted-foreground text-sm">#{selectedReport._id.slice(-6).toUpperCase()}</span>
              </h3>
              <button onClick={() => setSelectedReport(null)} className="text-muted hover:text-primary">&times;</button>
            </div>
            <div className="p-5">
              <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 mb-5 text-sm">
                <p><strong>Item:</strong> {selectedReport.itemName} ({selectedReport.category})</p>
                <p><strong>Guest:</strong> {selectedReport.userId?.name} ({selectedReport.userId?.phone})</p>
                <p className="mt-2 italic text-text-secondary">"{selectedReport.description}"</p>
              </div>

              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Status</label>
                  <select
                    value={statusUpdate}
                    onChange={(e) => setStatusUpdate(e.target.value)}
                    className="w-full border border-border bg-surface-1 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-accent outline-none"
                  >
                    <option value="Reported">Reported</option>
                    <option value="Matched">Matched</option>
                    <option value="Returned">Returned</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-primary mb-1">Owner/Staff Notes (visible to guest)</label>
                  <textarea
                    value={adminNotesUpdate}
                    onChange={(e) => setAdminNotesUpdate(e.target.value)}
                    rows={3}
                    placeholder="E.g., Match found with another report..."
                    className="w-full border border-border bg-surface-1 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-accent outline-none"
                  ></textarea>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-border mt-4">
                  <button type="button" onClick={() => setSelectedReport(null)} className="px-5 py-2.5 text-sm font-bold text-text-secondary hover:bg-surface-2 rounded-xl transition-colors">Cancel</button>
                  <button type="submit" disabled={updating} className="bg-primary hover:bg-primary-dark text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-colors flex items-center gap-2">
                    {updating && <Loader2 className="w-4 h-4 animate-spin" />}
                    Save Updates
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
