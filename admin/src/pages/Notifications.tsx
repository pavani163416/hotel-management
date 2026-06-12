import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, X, Bell, Clock, CheckCircle, Eye,
  MessageSquare, DollarSign, CalendarCheck, ShieldAlert,
  Send, Smartphone, UserCheck, Users, Building2
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import Topbar from "@/components/Topbar";
import PageHeader from "@/components/PageHeader";
import StatsCard from "@/components/StatsCard";
import { getNotifications, markNotificationRead, createNotification } from "@/services/api";
import socket from "@/services/socket";
import { useSocket } from "@/hooks/useSocket";

interface NotificationItem {
  _id: string;
  role: string;
  hotelId?: string;
  userId?: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "unread">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Push Notification Form State
  const [pushRole, setPushRole] = useState<"customer" | "manager" | "admin">("customer");
  const [pushMessage, setPushMessage] = useState("");
  const [pushType, setPushType] = useState("system");
  const [pushHotelId, setPushHotelId] = useState("");
  const [pushUserId, setPushUserId] = useState("");
  const [pushLoading, setPushLoading] = useState(false);
  const [pushSuccess, setPushSuccess] = useState<string | null>(null);
  const [pushError, setPushError] = useState<string | null>(null);

  const handlePushNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pushMessage.trim()) {
      setPushError("Notification message is required.");
      return;
    }
    setPushLoading(true);
    setPushError(null);
    setPushSuccess(null);
    try {
      await createNotification({
        role: pushRole,
        message: pushMessage.trim(),
        type: pushType,
        hotelId: pushHotelId.trim() || undefined,
        userId: pushUserId.trim() || undefined,
      });
      setPushSuccess("Notification pushed successfully in real-time!");
      setPushMessage("");
      setPushHotelId("");
      setPushUserId("");
      // Refresh list to show the new notification if we are admin
      fetchNotifications();
    } catch (err: any) {
      setPushError(err.message || "Failed to push notification.");
    } finally {
      setPushLoading(false);
    }
  };

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Admin notifications scope is { role: "admin" }
      const res: any = await getNotifications({ role: "admin" });
      setNotifications(res?.data || []);
    } catch (err: any) {
      setError(err.message || "Failed to fetch notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleIncomingNotification = useCallback((data: NotificationItem) => {
    setNotifications(prev => [data, ...prev.filter(item => item._id !== data._id)].slice(0, 100));
  }, []);

  useSocket<NotificationItem>("notification", handleIncomingNotification);

  const handleMarkRead = async (id: string) => {
    try {
      await markNotificationRead(id);
      setNotifications(prev =>
        prev.map(item => item._id === id ? { ...item, isRead: true } : item)
      );
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  };

  const handleMarkAllRead = async () => {
    const unread = notifications.filter(n => !n.isRead);
    if (unread.length === 0) return;
    try {
      await Promise.all(unread.map(n => markNotificationRead(n._id)));
      setNotifications(prev =>
        prev.map(item => ({ ...item, isRead: true }))
      );
    } catch (err) {
      console.error("Failed to mark all as read", err);
    }
  };

  const timeAgo = (iso?: string) => {
    if (!iso) return "just now";
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  // Filter logic
  const filtered = notifications.filter(n => {
    // Search filter
    if (search && !n.message.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    // Status filter
    if (statusFilter === "unread" && n.isRead) {
      return false;
    }
    // Type filter
    if (typeFilter === "owner_application") {
      if (!(n.type === "system" && n.message?.toLowerCase().includes("property owner application"))) return false;
    } else if (typeFilter !== "all" && n.type !== typeFilter) {
      return false;
    }
    return true;
  });

  // Stats calculation
  const totalCount = notifications.length;
  const unreadCount = notifications.filter(n => !n.isRead).length;
  const assistanceCount = notifications.filter(n => n.type === "assistance").length;
  const priceCount = notifications.filter(n => n.type === "price" || n.type === "price-request").length;
  const ownerAppCount = notifications.filter(n => n.type === "system" && n.message?.toLowerCase().includes("property owner application")).length;

  const getIcon = (type: string, message?: string) => {
    // Detect property owner application notifications by message content
    if (type === "system" && message?.toLowerCase().includes("property owner application")) {
      return <Building2 className="w-5 h-5 text-purple-400" />;
    }
    switch (type) {
      case "assistance":
        return <ShieldAlert className="w-5 h-5 text-warning" />;
      case "price":
      case "price-request":
        return <DollarSign className="w-5 h-5 text-gold" />;
      case "booking":
        return <CalendarCheck className="w-5 h-5 text-success" />;
      default:
        return <Bell className="w-5 h-5 text-bright" />;
    }
  };

  const getIconBg = (type: string, message?: string) => {
    if (type === "system" && message?.toLowerCase().includes("property owner application")) {
      return "rgba(168,85,247,0.15)";
    }
    switch (type) {
      case "assistance":
        return "rgba(212,168,67,0.15)";
      case "price":
      case "price-request":
        return "rgba(212,168,67,0.15)";
      case "booking":
        return "rgba(16,185,129,0.15)";
      default:
        return "rgba(255,255,255,0.08)";
    }
  };

  const getActionTarget = (n: NotificationItem) => {
    if (n.type === "price" || n.type === "price-request") {
      return { label: "Review Request", path: "/price-requests" };
    }
    if (n.type === "booking") {
      return { label: "View Bookings", path: "/bookings" };
    }
    if (n.message?.toLowerCase().includes("property owner") || n.message?.toLowerCase().includes("property application") || n.message?.toLowerCase().includes("owners")) {
      return { label: "Review Application", path: "/owners" };
    }
    if (n.message?.toLowerCase().includes("public support ticket")) {
      const match = n.message.match(/TKT-\d+/);
      return { label: "View Ticket", path: match ? `/public-support?search=${match[0]}` : "/public-support" };
    }
    return null;
  };

  return (
    <AdminLayout>
      <Topbar title="Notifications" />
      <div className="p-6 space-y-6">
        <PageHeader
          title="System Notifications"
          subtitle="View and manage administrative and operational notifications across all hotel properties."
          actions={
            unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-2 text-xs font-semibold bg-primary text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                Mark All as Read
              </button>
            )
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <StatsCard
            title="Total Notifications"
            value={totalCount}
            icon={<Bell className="w-5 h-5 text-bright" />}
          />
          <StatsCard
            title="Unread Alerts"
            value={unreadCount}
            icon={<Clock className="w-5 h-5 text-warning" />}
            trend={unreadCount > 0 ? "neutral" : "up"}
            change={unreadCount > 0 ? `${unreadCount} active` : "All read"}
          />
          <StatsCard
            title="Assistance Requests"
            value={assistanceCount}
            icon={<ShieldAlert className="w-5 h-5 text-warning" />}
            iconBg="rgba(212,168,67,0.15)"
          />
          <StatsCard
            title="Price Requests"
            value={priceCount}
            icon={<DollarSign className="w-5 h-5 text-gold" />}
            iconBg="rgba(212,168,67,0.15)"
          />
        </div>

        {/* Push Notification Console */}
        <div className="bg-[#112240] rounded-xl border border-border shadow-card overflow-hidden"
          style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
          <div className="px-5 py-4 border-b border-border flex items-center justify-between"
            style={{ borderColor: "rgba(255,255,255,0.08)" }}>
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-gold" />
              <div>
                <h3 className="text-sm font-semibold text-bright">Push Notification Console</h3>
                <p className="text-xs text-dim">Broadcast real-time push alerts to user segments</p>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <form onSubmit={handlePushNotification} className="space-y-6">
              {/* Audience Targets Tabs */}
              <div>
                <label className="block text-xs font-semibold text-soft uppercase tracking-wider mb-3">
                  Target Audience
                </label>
                <div className="grid grid-cols-3 gap-3 p-1 bg-surface-3 rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }}>
                  <button
                    type="button"
                    onClick={() => { setPushRole("customer"); setPushType("system"); }}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-md text-xs font-semibold transition-all ${
                      pushRole === "customer"
                        ? "bg-primary text-white shadow-lg"
                        : "text-muted hover:text-bright hover:bg-white/5"
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                    All Customers
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPushRole("manager"); setPushType("manager"); }}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-md text-xs font-semibold transition-all ${
                      pushRole === "manager"
                        ? "bg-primary text-white shadow-lg"
                        : "text-muted hover:text-bright hover:bg-white/5"
                    }`}
                  >
                    <UserCheck className="w-4 h-4" />
                    All Managers
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPushRole("admin"); setPushType("system"); }}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-md text-xs font-semibold transition-all ${
                      pushRole === "admin"
                        ? "bg-primary text-white shadow-lg"
                        : "text-muted hover:text-bright hover:bg-white/5"
                    }`}
                  >
                    <ShieldAlert className="w-4 h-4" />
                    All Admins
                  </button>
                </div>
              </div>

              {/* Dynamic Optional Inputs based on target audience */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-soft uppercase tracking-wider mb-2">
                    Notification Type
                  </label>
                  <select
                    value={pushType}
                    onChange={(e) => setPushType(e.target.value)}
                    className="w-full bg-surface-3 border border-border rounded-lg px-3 py-2 text-sm text-bright outline-none cursor-pointer"
                    style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.08)" }}
                  >
                    <option value="system" className="bg-[#0f1d30]">System Alert</option>
                    {pushRole === "customer" && (
                      <>
                        <option value="booking" className="bg-[#0f1d30]">Booking Update</option>
                        <option value="price" className="bg-[#0f1d30]">Price / Offer Alert</option>
                      </>
                    )}
                    {pushRole === "manager" && (
                      <>
                        <option value="manager" className="bg-[#0f1d30]">Manager Notice</option>
                        <option value="price" className="bg-[#0f1d30]">Price Request Alert</option>
                      </>
                    )}
                    <option value="assistance" className="bg-[#0f1d30]">Assistance Request</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-soft uppercase tracking-wider mb-2">
                    Hotel Scope (Optional)
                  </label>
                  <input
                    type="text"
                    value={pushHotelId}
                    onChange={(e) => setPushHotelId(e.target.value)}
                    placeholder="e.g. H001, H002"
                    className="w-full bg-transparent border border-border rounded-lg px-3 py-2 text-sm text-bright outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.08)" }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-soft uppercase tracking-wider mb-2">
                  Target Specific User ID / Email (Optional)
                </label>
                <input
                  type="text"
                  value={pushUserId}
                  onChange={(e) => setPushUserId(e.target.value)}
                  placeholder="Enter specific user's email or database user ID"
                  className="w-full bg-transparent border border-border rounded-lg px-3 py-2 text-sm text-bright outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.08)" }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-soft uppercase tracking-wider mb-2">
                  Alert Message
                </label>
                <textarea
                  value={pushMessage}
                  onChange={(e) => setPushMessage(e.target.value)}
                  placeholder="Type the message to push..."
                  rows={3}
                  className="w-full bg-transparent border border-border rounded-lg px-3 py-2 text-sm text-bright outline-none resize-none"
                  style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.08)" }}
                />
              </div>

              {pushSuccess && (
                <div className="p-3 bg-success/15 border border-success/30 text-success text-xs font-semibold rounded-lg flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  {pushSuccess}
                </div>
              )}

              {pushError && (
                <div className="p-3 bg-danger/15 border border-danger/30 text-danger text-xs font-semibold rounded-lg">
                  {pushError}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={pushLoading}
                  className="flex items-center gap-2 text-xs font-semibold bg-primary text-white px-5 py-2.5 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-4 h-4" />
                  {pushLoading ? "Pushing..." : "Push Real-Time Alert"}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Filters and List */}
        <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden"
          style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
          
          <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4 border-b border-border"
            style={{ borderColor: "rgba(255,255,255,0.08)" }}>
            
            {/* Search */}
            <div className="flex items-center gap-2 bg-surface-3 rounded-lg px-3 py-2 flex-1 min-w-[240px]"
              style={{ background: "rgba(255,255,255,0.05)" }}>
              <Search className="w-4 h-4 text-muted shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search notification messages..."
                className="bg-transparent text-sm outline-none w-full text-bright placeholder:text-muted"
              />
              {search && (
                <button onClick={() => setSearch("")}>
                  <X className="w-3.5 h-3.5 text-muted hover:text-bright" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Status Tabs */}
              <div className="flex bg-surface-3 p-1 rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }}>
                <button
                  onClick={() => setStatusFilter("all")}
                  className={`text-xs font-semibold px-3.5 py-1.5 rounded-md transition-all ${
                    statusFilter === "all"
                      ? "bg-primary text-white"
                      : "text-muted hover:text-bright"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setStatusFilter("unread")}
                  className={`text-xs font-semibold px-3.5 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                    statusFilter === "unread"
                      ? "bg-primary text-white"
                      : "text-muted hover:text-bright"
                  }`}
                >
                  Unread
                  {unreadCount > 0 && (
                    <span className="bg-warning text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                      {unreadCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Type Filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-surface-3 border border-border rounded-lg px-3 py-2 text-sm text-bright outline-none cursor-pointer"
                style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(255,255,255,0.08)" }}
              >
                <option value="all" className="bg-[#0f1d30]">All Types</option>
                <option value="booking" className="bg-[#0f1d30]">Bookings</option>
                <option value="assistance" className="bg-[#0f1d30]">Assistance</option>
                <option value="price" className="bg-[#0f1d30]">Price Requests</option>
                <option value="owner_application" className="bg-[#0f1d30]">Property Applications</option>
              </select>
            </div>
          </div>

          {/* List Area */}
          <div className="divide-y divide-border" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
            {loading ? (
              <div className="p-12 text-center text-muted text-sm">
                Loading notifications...
              </div>
            ) : error ? (
              <div className="p-12 text-center text-danger text-sm">
                {error}
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center text-muted text-sm">
                No notifications found.
              </div>
            ) : (
              filtered.map((notif) => {
                const target = getActionTarget(notif);
                return (
                  <div
                    key={notif._id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-4 transition-all ${
                      notif.isRead ? "opacity-60 hover:opacity-90" : "bg-bright-light"
                    }`}
                    style={{
                      background: notif.isRead ? "transparent" : "rgba(255,255,255,0.02)",
                      borderBottom: "1px solid rgba(255,255,255,0.04)"
                    }}
                  >
                    <div className="flex items-start gap-4">
                      {/* Icon */}
                      <div className="w-10 h-10 rounded-xl grid place-items-center shrink-0 mt-0.5"
                        style={{
                          background: getIconBg(notif.type, notif.message),
                          border: "1px solid rgba(255,255,255,0.05)"
                        }}
                      >
                        {getIcon(notif.type, notif.message)}
                      </div>
                      
                      {/* Message and Metadata */}
                      <div className="space-y-1">
                        <p className={`text-sm leading-relaxed ${notif.isRead ? "text-soft" : "text-bright font-semibold"}`}>
                          {notif.message}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-dim capitalize">
                          <span>{notif.type}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {timeAgo(notif.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                      {!notif.isRead && (
                        <button
                          onClick={() => handleMarkRead(notif._id)}
                          className="flex items-center gap-1.5 text-xs font-semibold text-gold bg-gold/10 hover:bg-gold/20 px-3 py-1.5 rounded-lg border border-gold/25 transition-colors"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Mark Read
                        </button>
                      )}
                      
                      {target && (
                        <button
                          onClick={() => navigate(target.path)}
                          className="flex items-center gap-1.5 text-xs font-semibold text-bright bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          {target.label}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {!loading && !error && filtered.length > 0 && (
            <div className="px-5 py-3 border-t border-border" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
              <p className="text-xs text-muted">
                Showing {filtered.length} of {notifications.length} notification{notifications.length !== 1 ? "s" : ""}
              </p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
