import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, X, Bell, Clock, CheckCircle, Eye,
  MessageSquare, DollarSign, CalendarCheck, ShieldAlert
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import Topbar from "@/components/Topbar";
import PageHeader from "@/components/PageHeader";
import StatsCard from "@/components/StatsCard";
import { getNotifications, markNotificationRead } from "@/services/api";

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
    if (typeFilter !== "all" && n.type !== typeFilter) {
      return false;
    }
    return true;
  });

  // Stats calculation
  const totalCount = notifications.length;
  const unreadCount = notifications.filter(n => !n.isRead).length;
  const assistanceCount = notifications.filter(n => n.type === "assistance").length;
  const priceCount = notifications.filter(n => n.type === "price" || n.type === "price-request").length;

  const getIcon = (type: string) => {
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

  const getIconBg = (type: string) => {
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
                          background: getIconBg(notif.type),
                          border: "1px solid rgba(255,255,255,0.05)"
                        }}
                      >
                        {getIcon(notif.type)}
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
