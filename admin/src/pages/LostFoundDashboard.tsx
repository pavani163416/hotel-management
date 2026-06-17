import React, { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import Topbar from "@/components/Topbar";
import { Loader2, PackageSearch, Search, Filter, RefreshCcw, Eye } from "lucide-react";
import axios from "axios";
import { format } from "date-fns";

interface LostFoundEntry {
  _id: string;
  userId: { _id: string; name: string; email: string };
  hotelId: { _id: string; name: string };
  type: string;
  itemName: string;
  category: string;
  description: string;
  dateLostFound: string;
  locationDetails: string;
  status: string;
  adminNotes: string;
  createdAt: string;
}

export default function LostFoundDashboard() {
  const [reports, setReports] = useState<LostFoundEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  
  const [selectedReport, setSelectedReport] = useState<LostFoundEntry | null>(null);
  const [statusUpdate, setStatusUpdate] = useState("");
  const [adminNotesUpdate, setAdminNotesUpdate] = useState("");
  const [updating, setUpdating] = useState(false);

  const fetchReports = async (page = 1) => {
    setLoading(true);
    try {
      let query = `?page=${page}&limit=20`;
      if (typeFilter) query += `&type=${typeFilter}`;
      if (statusFilter) query += `&status=${statusFilter}`;
      
      const res = await axios.get(`http://localhost:5000/api/lost-found/admin${query}`, {
        withCredentials: true
      });
      if (res.data.success) {
        setReports(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (error) {
      console.error("Failed to fetch reports", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports(pagination.page);
  }, [pagination.page, typeFilter, statusFilter]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReport) return;
    setUpdating(true);
    try {
      const res = await axios.put(`http://localhost:5000/api/lost-found/${selectedReport._id}/status`, {
        status: statusUpdate,
        adminNotes: adminNotesUpdate
      }, { withCredentials: true });
      
      if (res.data.success) {
        fetchReports(pagination.page);
        setSelectedReport(null);
      }
    } catch (error) {
      console.error("Update failed", error);
    } finally {
      setUpdating(false);
    }
  };

  const filtered = reports.filter(r => {
    const s = search.toLowerCase();
    return (
      r.itemName?.toLowerCase().includes(s) ||
      r.userId?.name?.toLowerCase().includes(s) ||
      r.hotelId?.name?.toLowerCase().includes(s) ||
      r._id.toLowerCase().includes(s)
    );
  });

  return (
    <AdminLayout>
      <Topbar title="Lost & Found" />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Lost & Found Management</h2>
          <p className="text-sm text-gray-500">Monitor and manage lost/found items across properties.</p>
        </div>
        <button
          onClick={() => fetchReports(pagination.page)}
          className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          <RefreshCcw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="p-4 border-b border-gray-200 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search items, users, hotels, or ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500 transition-all text-sm"
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-36">
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value);
                  setPagination(p => ({ ...p, page: 1 }));
                }}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500 text-sm appearance-none cursor-pointer"
              >
                <option value="">All Types</option>
                <option value="Lost">Lost</option>
                <option value="Found">Found</option>
              </select>
            </div>
            <div className="relative flex-1 md:w-40">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPagination(p => ({ ...p, page: 1 }));
                }}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500 text-sm appearance-none cursor-pointer"
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

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                <th className="px-6 py-4 font-semibold">Ref ID</th>
                <th className="px-6 py-4 font-semibold">Type</th>
                <th className="px-6 py-4 font-semibold">Item & Category</th>
                <th className="px-6 py-4 font-semibold">Hotel</th>
                <th className="px-6 py-4 font-semibold">Date & Location</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <PackageSearch className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    No lost & found reports match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r._id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 text-xs font-mono text-gray-500">
                      {r._id.slice(-6).toUpperCase()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-bold uppercase rounded-md border ${
                        r.type === 'Lost' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {r.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">{r.itemName}</p>
                      <p className="text-xs text-gray-500">{r.category}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-800">{r.hotelId?.name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-800 font-medium">
                        {format(new Date(r.dateLostFound), "MMM d, yyyy")}
                      </p>
                      <p className="text-xs text-gray-500">{r.locationDetails}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${
                        r.status === "Reported" ? "bg-gray-100 text-gray-700" :
                        r.status === "Matched" ? "bg-green-100 text-green-700" :
                        r.status === "Returned" ? "bg-blue-100 text-blue-700" :
                        "bg-red-100 text-red-700"
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => {
                          setSelectedReport(r);
                          setStatusUpdate(r.status);
                          setAdminNotesUpdate(r.adminNotes || "");
                        }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                        title="View & Edit"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="p-4 border-t border-gray-200 flex items-center justify-between">
            <span className="text-sm text-gray-500">
              Showing page {pagination.page} of {pagination.pages}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page === 1}
                onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                className="px-3 py-1.5 border border-gray-200 rounded text-sm disabled:opacity-50 hover:bg-gray-50"
              >
                Previous
              </button>
              <button
                disabled={pagination.page === pagination.pages}
                onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                className="px-3 py-1.5 border border-gray-200 rounded text-sm disabled:opacity-50 hover:bg-gray-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl w-full max-w-lg shadow-xl overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                Update Report <span className="font-mono text-gray-500 text-sm">#{selectedReport._id.slice(-6).toUpperCase()}</span>
              </h3>
              <button onClick={() => setSelectedReport(null)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <div className="p-5">
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-5 text-sm">
                <p><strong>Item:</strong> {selectedReport.itemName} ({selectedReport.category})</p>
                <p><strong>User:</strong> {selectedReport.userId?.name} ({selectedReport.userId?.email})</p>
                <p><strong>Hotel:</strong> {selectedReport.hotelId?.name}</p>
                <p className="mt-2 text-gray-600"><em>"{selectedReport.description}"</em></p>
              </div>

              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={statusUpdate}
                    onChange={(e) => setStatusUpdate(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="Reported">Reported</option>
                    <option value="Matched">Matched</option>
                    <option value="Returned">Returned</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Admin Notes (Internal & User Updates)</label>
                  <textarea
                    value={adminNotesUpdate}
                    onChange={(e) => setAdminNotesUpdate(e.target.value)}
                    rows={3}
                    placeholder="E.g., Match found with item #xyz..."
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  ></textarea>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setSelectedReport(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
                  <button type="submit" disabled={updating} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2">
                    {updating && <Loader2 className="w-4 h-4 animate-spin" />}
                    Save Updates
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
