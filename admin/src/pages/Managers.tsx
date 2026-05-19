import { useState, useEffect } from "react";
import PasswordInput from "@/components/PasswordInput";
import { Search, Plus, Edit2, Trash2, X, Loader2, UserCheck, UserX, Building2, Bell, Send } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import Topbar from "@/components/Topbar";
import PageHeader from "@/components/PageHeader";
import StatsCard from "@/components/StatsCard";
import StatusBadge from "@/components/StatusBadge";
import Modal from "@/components/Modal";
import { useHotels } from "@/context/HotelsContext";
import { useAdmin } from "@/context/AdminContext";
import { sendManagerAlert } from "@/services/api";

interface Manager {
  _id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  hotelId?: string;
  hotelName?: string;
}

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function Managers() {
  const { hotels } = useHotels();
  const { token } = useAdmin();
  
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [hotelFilter, setHotelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Manager | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Manager | null>(null);
  
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phoneNumber: "",
    hotelId: "",
    hotelName: "",
    isActive: true,
  });
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ── Send Alert state ──────────────────────────────────
  const [alertTarget, setAlertTarget] = useState<Manager | null>(null);
  const [alertMsg, setAlertMsg]       = useState("");
  const [alertPriority, setAlertPriority] = useState<"high" | "medium">("medium");
  const [alertSending, setAlertSending]   = useState(false);
  const [alertFeedback, setAlertFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Fetch managers
  const fetchManagers = async () => {
    try {
      const res = await fetch(`${API}/admin/managers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setManagers(data.data);
      }
    } catch (e) {
      console.error("Failed to fetch managers:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchManagers();
  }, [token]);

  // Filter managers
  const filteredManagers = managers.filter((m) => {
    const matchSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase());
    const matchHotel = hotelFilter === "all" || m.hotelId === hotelFilter;
    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && m.isActive) ||
      (statusFilter === "inactive" && !m.isActive);
    return matchSearch && matchHotel && matchStatus;
  });

  // Open add modal
  const openAdd = () => {
    setEditTarget(null);
    setForm({ name: "", email: "", password: "", phoneNumber: "", hotelId: "", hotelName: "", isActive: true });
    setError("");
    setSuccess("");
    setAddOpen(true);
  };

  // Open edit modal
  const openEdit = (manager: Manager) => {
    setEditTarget(manager);
    setForm({
      name: manager.name,
      email: manager.email,
      password: "",
      phoneNumber: (manager as any).phoneNumber || "",
      hotelId: manager.hotelId || "",
      hotelName: manager.hotelName || "",
      isActive: manager.isActive,
    });
    setError("");
    setSuccess("");
    setAddOpen(true);
  };

  // Handle hotel selection
  const handleHotelChange = (hotelId: string) => {
    const hotel = hotels.find((h) => h.hotelId === hotelId);
    setForm((prev) => ({
      ...prev,
      hotelId,
      hotelName: hotel?.name || "",
    }));
  };

  // Save manager (create or update)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const url = editTarget
        ? `${API}/admin/managers/${editTarget._id}`
        : `${API}/admin/managers`;
      const method = editTarget ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess(editTarget ? "Manager updated successfully" : "Manager created successfully");
        setTimeout(() => {
          setAddOpen(false);
          fetchManagers();
        }, 1000);
      } else {
        setError(data.message || "Failed to save manager");
      }
    } catch (e: any) {
      setError(e.message || "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  // Delete manager
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);

    try {
      const res = await fetch(`${API}/admin/managers/${deleteTarget._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (data.success) {
        setDeleteTarget(null);
        fetchManagers();
      } else {
        setError(data.message || "Failed to delete manager");
      }
    } catch (e: any) {
      setError(e.message || "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  // Send alert to manager
  const handleSendAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertTarget?.hotelId || !alertMsg.trim()) return;
    setAlertSending(true);
    setAlertFeedback(null);
    try {
      await sendManagerAlert(alertTarget.hotelId, alertMsg.trim(), alertPriority);
      setAlertFeedback({ type: "ok", text: `Alert sent to ${alertTarget.name} successfully!` });
      setAlertMsg("");
      setTimeout(() => { setAlertTarget(null); setAlertFeedback(null); }, 1800);
    } catch (e: any) {
      setAlertFeedback({ type: "err", text: e.message || "Failed to send alert." });
    } finally {
      setAlertSending(false);
    }
  };

  // Format date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "Never";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Time ago
  const timeAgo = (dateStr?: string) => {
    if (!dateStr) return "Never";
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  // Stats
  const totalManagers = managers.length;
  const activeManagers = managers.filter((m) => m.isActive).length;
  const inactiveManagers = totalManagers - activeManagers;

  return (
    <AdminLayout>
      <Topbar />
      <PageHeader
        title="Hotel Managers"
        subtitle="Manage hotel manager accounts and assignments"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatsCard
          title="Total Managers"
          value={totalManagers}
          icon={<UserCheck className="w-5 h-5" />}
        />
        <StatsCard
          title="Active Managers"
          value={activeManagers}
          icon={<UserCheck className="w-5 h-5" />}
        />
        <StatsCard
          title="Inactive Managers"
          value={inactiveManagers}
          icon={<UserX className="w-5 h-5" />}
        />
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 w-64 bg-slate-800 border border-slate-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Hotel Filter */}
          <select
            value={hotelFilter}
            onChange={(e) => setHotelFilter(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Hotels</option>
            {hotels.map((h) => (
              <option key={h.hotelId} value={h.hotelId}>
                {h.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-amber-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Add Button */}
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Manager
        </button>
      </div>

      {/* Managers Table */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          </div>
        ) : filteredManagers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <UserCheck className="w-12 h-12 mb-3 opacity-50" />
            <p>No managers found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Assigned Hotel
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredManagers.map((manager) => (
                  <tr
                    key={manager._id}
                    className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center">
                          <span className="text-amber-500 font-semibold">
                            {manager.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="text-gray-200 font-medium">{manager.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-300">{manager.email}</td>
                    <td className="px-6 py-4">
                      {manager.hotelName ? (
                        <div className="flex items-center gap-2 text-gray-300">
                          <Building2 className="w-4 h-4 text-amber-500" />
                          {manager.hotelName}
                        </div>
                      ) : (
                        <span className="text-gray-500 italic">Not assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge
                        status={manager.isActive ? "Active" : "Inactive"}
                      />
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-sm">
                      {manager.lastLogin ? (
                        <div>
                          <div>{formatDate(manager.lastLogin)}</div>
                          <div className="text-xs text-gray-500">
                            {timeAgo(manager.lastLogin)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-500">Never</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => { setAlertTarget(manager); setAlertMsg(""); setAlertPriority("medium"); setAlertFeedback(null); }}
                          className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-gray-400 hover:text-amber-400"
                          title="Send Alert"
                        >
                          <Bell className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEdit(manager)}
                          className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-gray-400 hover:text-amber-500"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(manager)}
                          className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-gray-400 hover:text-red-500"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        title={editTarget ? "Edit Manager" : "Add New Manager"}
      >
        <form onSubmit={handleSave} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
              {success}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Name *
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-gray-200 focus:outline-none focus:border-amber-500"
              placeholder="Enter manager name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Email *
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-gray-200 focus:outline-none focus:border-amber-500"
              placeholder="manager@hotel.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Password {editTarget ? "(leave blank to keep current)" : "*"}
            </label>
            <PasswordInput
              required={!editTarget}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: (e.target as HTMLInputElement).value })}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-gray-200 focus:outline-none focus:border-amber-500"
              placeholder={editTarget ? "••••••••" : "Enter password"}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Phone Number <span className="text-amber-400 text-xs">(required for 2FA login)</span>
            </label>
            <input
              type="tel"
              value={form.phoneNumber}
              onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-gray-200 focus:outline-none focus:border-amber-500"
              placeholder="+91XXXXXXXXXX or +1XXXXXXXXXX"
            />
            <p className="text-xs text-gray-500 mt-1">Include country code. Manager cannot login without this.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Hotel *
            </label>
            <select
              value={form.hotelId}
              onChange={(e) => handleHotelChange(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-gray-200 focus:outline-none focus:border-amber-500"
            >
              <option value="">Select a hotel</option>
              {hotels.map((h) => (
                <option key={h.hotelId} value={h.hotelId}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-amber-600 focus:ring-amber-500"
            />
            <label htmlFor="isActive" className="text-sm text-gray-300">
              Active (manager can login)
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setAddOpen(false)}
              className="px-4 py-2 text-gray-400 hover:text-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-600/50 text-white rounded-lg font-medium transition-colors"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editTarget ? "Update Manager" : "Create Manager"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Manager"
      >
        <div className="space-y-4">
          <p className="text-gray-300">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-white">{deleteTarget?.name}</span>?
            This action cannot be undone.
          </p>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setDeleteTarget(null)}
              className="px-4 py-2 text-gray-400 hover:text-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-600/50 text-white rounded-lg font-medium transition-colors"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Delete Manager
            </button>
          </div>
        </div>
      </Modal>

      {/* Send Alert Modal */}
      <Modal
        isOpen={!!alertTarget}
        onClose={() => { setAlertTarget(null); setAlertFeedback(null); setAlertMsg(""); }}
        title="Send Alert to Manager"
      >
        <form onSubmit={handleSendAlert} className="space-y-4">
          {/* Manager info */}
          <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-700/40 border border-slate-600/40">
            <div className="w-9 h-9 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
              <span className="text-amber-400 font-bold text-sm">{alertTarget?.name?.charAt(0)}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-200">{alertTarget?.name}</p>
              <p className="text-xs text-gray-400">{alertTarget?.hotelName || "No hotel assigned"}</p>
            </div>
          </div>

          {!alertTarget?.hotelId && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-400 text-sm">
              ⚠️ This manager has no hotel assigned. Alert cannot be sent.
            </div>
          )}

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Priority</label>
            <div className="flex gap-3">
              {(["medium", "high"] as const).map((p) => (
                <label key={p} className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${
                  alertPriority === p
                    ? p === "high" ? "border-red-500/60 bg-red-500/10 text-red-400" : "border-amber-500/60 bg-amber-500/10 text-amber-400"
                    : "border-slate-600 text-gray-400 hover:border-slate-500"
                }`}>
                  <input type="radio" name="priority" value={p} checked={alertPriority === p}
                    onChange={() => setAlertPriority(p)} className="sr-only" />
                  <span className={`w-2 h-2 rounded-full ${p === "high" ? "bg-red-400" : "bg-amber-400"}`} />
                  <span className="text-sm font-medium capitalize">{p}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Alert Message *
            </label>
            <textarea
              required
              rows={3}
              value={alertMsg}
              onChange={(e) => setAlertMsg(e.target.value)}
              placeholder="e.g. VIP guest arriving at 3 PM — please prepare suite 401..."
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-gray-200 text-sm focus:outline-none focus:border-amber-500 resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">{alertMsg.length}/200 characters</p>
          </div>

          {/* Feedback */}
          {alertFeedback && (
            <div className={`p-3 rounded-lg text-sm ${
              alertFeedback.type === "ok"
                ? "bg-green-500/10 border border-green-500/30 text-green-400"
                : "bg-red-500/10 border border-red-500/30 text-red-400"
            }`}>
              {alertFeedback.text}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setAlertTarget(null); setAlertFeedback(null); setAlertMsg(""); }}
              className="px-4 py-2 text-gray-400 hover:text-gray-200 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={alertSending || !alertTarget?.hotelId || !alertMsg.trim()}
              className="flex items-center gap-2 px-6 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-600/40 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors">
              {alertSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send Alert
            </button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}
