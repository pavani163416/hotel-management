import { useState, useEffect } from "react";
import { Loader2, Users, Clock, Filter, AlertCircle, Bell } from "lucide-react";
import { toast } from "sonner";
import dayjs from "dayjs";
import { API } from "@/services/api"; // Updated import

interface WaitlistEntry {
  _id: string;
  hotelId: string;
  roomTypeId: string | null;
  startDate: string;
  endDate: string;
  position: number;
  status: string;
  notifiedAt: string | null;
  userId: { _id: string; name: string; email: string; phone: string };
  createdAt: string;
}

export default function OwnerWaitlist() {
  const [waitlists, setWaitlists] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState("Pending");

  // To fetch waitlists, we need to know the owner's properties.
  // For simplicity, we can just call an endpoint that returns waitlists for all properties they own.
  // Wait, waitlistController.getHotelWaitlists needs hotelId.
  // Let's assume the owner has selected a property in the portal context, or we fetch all.
  // We'll update the API later or just fetch using a new owner route?
  // Our WaitlistRoutes has: router.get("/hotel/:hotelId", protect, authorizeRoles("owner", "admin"), getHotelWaitlists);

  const fetchWaitlists = async () => {
    try {
      setLoading(true);
      // We need to fetch owner's hotels first to get hotelIds
      const hotelsRes = await API.get("/hotels/my-properties");
      if (hotelsRes.data.success && hotelsRes.data.data.length > 0) {
        const hotelId = hotelsRes.data.data[0].hotelId; // Default to first property
        const res = await API.get(`/waitlist/hotel/${hotelId}?status=${statusFilter}`);
        setWaitlists(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch waitlists", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWaitlists();
  }, [statusFilter]);

  const notifyUser = async (waitlistId: string, hotelId: string, startDate: string, endDate: string) => {
    if (!confirm("Notify this user that a room is available? They will have 24 hours to book.")) return;
    
    setActionLoading(waitlistId);
    try {
      const res = await API.post(`/waitlist/notify/${hotelId}`, {
        startDate, endDate
      });
      if (res.data.success) {
        toast.success("User notified successfully!");
        fetchWaitlists();
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to notify user.");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading && waitlists.length === 0) {
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
            <Users className="w-6 h-6 text-accent" />
            Waitlist Management
          </h2>
          <p className="text-muted-foreground text-sm">Monitor and notify users waiting for a room.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-surface-2 p-1 rounded-lg border border-border">
            <Filter className="w-4 h-4 text-muted-foreground ml-2" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent border-none outline-none text-sm font-medium pr-2 text-primary cursor-pointer"
            >
              <option value="Pending">Pending</option>
              <option value="Notified">Notified</option>
              <option value="Booked">Booked</option>
              <option value="Cancelled">Cancelled</option>
              <option value="Expired">Expired</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-2/50 text-muted-foreground text-xs uppercase tracking-wider">
                <th className="p-4 font-semibold">User</th>
                <th className="p-4 font-semibold">Dates</th>
                <th className="p-4 font-semibold">Position</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm divide-y divide-border">
              {waitlists.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No waitlist entries found for this status.
                  </td>
                </tr>
              ) : (
                waitlists.map((w) => (
                  <tr key={w._id} className="hover:bg-surface-1/50 transition-colors">
                    <td className="p-4">
                      <p className="font-semibold text-primary">{w.userId?.name}</p>
                      <p className="text-xs text-muted-foreground">{w.userId?.email}</p>
                      <p className="text-xs text-muted-foreground">{w.userId?.phone}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-medium">{dayjs(w.startDate).format("MMM D")} - {dayjs(w.endDate).format("MMM D")}</p>
                      <p className="text-xs text-muted-foreground">Joined {dayjs(w.createdAt).fromNow()}</p>
                    </td>
                    <td className="p-4">
                      {w.status === "Pending" ? (
                        <span className="inline-flex items-center justify-center bg-secondary text-primary font-bold w-8 h-8 rounded-full border border-border">
                          {w.position}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                        w.status === "Pending" ? "bg-amber-100 text-amber-800" :
                        w.status === "Notified" ? "bg-blue-100 text-blue-800" :
                        w.status === "Booked" ? "bg-green-100 text-green-800" :
                        "bg-gray-100 text-gray-800"
                      }`}>
                        {w.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {w.status === "Pending" && (
                        <button
                          onClick={() => notifyUser(w._id, w.hotelId, w.startDate, w.endDate)}
                          disabled={actionLoading === w._id}
                          className="inline-flex items-center gap-1.5 bg-accent hover:bg-accent/90 text-white px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                          {actionLoading === w._id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Bell className="w-3.5 h-3.5" />
                          )}
                          Notify
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
