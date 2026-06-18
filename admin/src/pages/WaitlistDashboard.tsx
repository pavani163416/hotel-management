import React, { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import Topbar from "@/components/Topbar";
import { Loader2, Users, Clock, Search, Filter, RefreshCcw } from "lucide-react";
import axios from "axios";
import { format } from "date-fns";

interface WaitlistEntry {
  _id: string;
  userId: { _id: string; name: string; email: string };
  hotelId: { _id: string; name: string };
  roomTypeId: { name: string } | null;
  startDate: string;
  endDate: string;
  position: number;
  status: string;
  createdAt: string;
}

export default function WaitlistDashboard() {
  const [waitlists, setWaitlists] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });

  const fetchWaitlists = async (page = 1) => {
    setLoading(true);
    try {
      let query = `?page=${page}&limit=20`;
      if (statusFilter) query += `&status=${statusFilter}`;
      // Note: we can filter by hotelId in backend, but for search we will filter client side
      
      const res = await axios.get(`http://localhost:5000/api/waitlist/admin${query}`, {
        withCredentials: true
      });
      if (res.data.success) {
        setWaitlists(res.data.data);
        setPagination(res.data.pagination);
      }
    } catch (error) {
      console.error("Failed to fetch waitlists", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWaitlists(pagination.page);
  }, [pagination.page, statusFilter]);

  const filtered = waitlists.filter(w => {
    const s = search.toLowerCase();
    return (
      w.userId?.name?.toLowerCase().includes(s) ||
      w.userId?.email?.toLowerCase().includes(s) ||
      w.hotelId?.name?.toLowerCase().includes(s)
    );
  });

  return (
    <AdminLayout>
      <Topbar title="Waitlist Queue" />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Waitlist Management</h2>
          <p className="text-sm text-gray-500">Monitor all customer waitlist requests across properties.</p>
        </div>
        <button
          onClick={() => fetchWaitlists(pagination.page)}
          className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          <RefreshCcw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
        <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by user or hotel..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500 focus:bg-white transition-all text-sm"
            />
          </div>
          <div className="relative w-full sm:w-48">
            <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPagination(p => ({ ...p, page: 1 }));
              }}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-500 text-sm appearance-none cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Notified">Notified</option>
              <option value="Booked">Booked</option>
              <option value="Expired">Expired</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                <th className="px-6 py-4 font-semibold">User</th>
                <th className="px-6 py-4 font-semibold">Hotel</th>
                <th className="px-6 py-4 font-semibold">Dates</th>
                <th className="px-6 py-4 font-semibold">Position</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    No waitlist entries found.
                  </td>
                </tr>
              ) : (
                filtered.map((w) => (
                  <tr key={w._id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-900">{w.userId?.name}</p>
                      <p className="text-xs text-gray-500">{w.userId?.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-800">{w.hotelId?.name}</p>
                      <p className="text-xs text-gray-500">{w.roomTypeId?.name || 'Any Room'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-800 font-medium">
                        {format(new Date(w.startDate), "MMM d")} - {format(new Date(w.endDate), "MMM d")}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      {w.status === "Pending" ? (
                        <span className="inline-flex items-center justify-center bg-gray-100 font-bold w-7 h-7 rounded-full text-gray-700 text-xs">
                          {w.position}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${
                        w.status === "Pending" ? "bg-amber-100 text-amber-700" :
                        w.status === "Notified" ? "bg-blue-100 text-blue-700" :
                        w.status === "Booked" ? "bg-green-100 text-green-700" :
                        "bg-gray-100 text-gray-700"
                      }`}>
                        {w.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs">
                      {format(new Date(w.createdAt), "MMM d, yyyy")}
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
    </AdminLayout>
  );
}
