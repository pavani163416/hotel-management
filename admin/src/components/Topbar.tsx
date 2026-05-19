import { Bell, Search, Hotel, X, UserCircle } from "lucide-react";
import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAdmin } from "@/context/AdminContext";
import { useBookings } from "@/context/BookingsContext";
import { useHotels } from "@/context/HotelsContext";
import { useSocket } from "@/hooks/useSocket";
import socket from "@/services/socket";
import { getNotifications, markNotificationRead } from "@/services/api";
import type { NewBookingAlert } from "@/context/BookingsContext";

interface Props {
  title?: string;
  searchPlaceholder?: string;
}

type NotificationItem = {
  _id: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
};

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function Topbar({ searchPlaceholder }: Props) {
  const { admin, logout } = useAdmin();
  const { liveAlerts, pushLiveAlert, clearLiveAlerts } = useBookings();
  const { hotels } = useHotels();
  const navigate = useNavigate();
  const [search, setSearch]                   = useState("");
  const [showNotifs, setShowNotifs]           = useState(false);
  const [showSettings, setShowSettings]       = useState(false);
  const [showHotelSwitcher, setShowHotelSwitcher] = useState(false);
  const [toast, setToast]                     = useState<NewBookingAlert | null>(null);
  const [notificationToast, setNotificationToast] = useState<NotificationItem | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const notificationScope = admin?.role === "Manager"
    ? { role: "manager", hotelId: admin.assignedHotelId || admin.hotelId }
    : { role: "admin" };

  // Register for notifications and fetch once on mount (when admin is available)
  const notifFetched = useRef(false);
  useEffect(() => {
    if (!admin || notifFetched.current) return;
    notifFetched.current = true;
    socket.emit("registerNotifications", notificationScope);
    getNotifications(notificationScope)
      .then((res: any) => setNotifications(res?.data || []))
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admin?.email]);

  const handleNewBooking = useCallback((data: NewBookingAlert) => {
    pushLiveAlert(data);
    setToast(data);
    setTimeout(() => setToast(null), 5000);
  }, [pushLiveAlert]);

  const handleNotification = useCallback((data: NotificationItem) => {
    setNotifications((prev) => [data, ...prev.filter((n) => n._id !== data._id)].slice(0, 50));
    setNotificationToast(data);
    setTimeout(() => setNotificationToast(null), 4500);
  }, []);

  useSocket<NewBookingAlert>("newBooking", handleNewBooking);
  useSocket<NotificationItem>("notification", handleNotification);

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const liveCount      = liveAlerts.length;

  const openNotification = (n: NotificationItem) => {
    if (!n.isRead) {
      setNotifications((prev) => prev.map((item) => item._id === n._id ? { ...item, isRead: true } : item));
      markNotificationRead(n._id).catch(() => {});
    }
    setShowNotifs(false);
    navigate(n.type === "price"
      ? (admin?.role === "Manager" ? "/m/pricing" : "/price-requests")
      : n.type === "assistance" ? "/m/dashboard"
      : n.type === "manager" ? "/m/profile" : (admin?.role === "Manager" ? "/m/bookings" : "/bookings"));
  };

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && search.trim()) {
      navigate("/bookings");
      setSearch("");
    }
  };

  // Shared dropdown style
  const dropdownStyle: React.CSSProperties = {
    background: "#112240",
    border: "1px solid rgba(255,255,255,0.1)",
    boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
    borderRadius: "16px",
  };

  const dropdownHeaderStyle: React.CSSProperties = {
    borderBottom: "1px solid rgba(255,255,255,0.07)",
  };

  const dropdownItemHover = {
    onMouseEnter: (e: React.MouseEvent) => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)",
    onMouseLeave: (e: React.MouseEvent) => (e.currentTarget as HTMLElement).style.background = "transparent",
  };

  return (
    <div
      className="flex items-center justify-between h-14 px-6 sticky top-0 z-20"
      style={{
        background: "rgba(10,22,40,0.92)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {/* Search */}
      <div className="flex items-center gap-2 rounded-xl px-3 py-2 w-72"
        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <Search className="w-3.5 h-3.5 text-dim shrink-0" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleSearch}
          placeholder={searchPlaceholder || "Search bookings, guests, hotels..."}
          className="bg-transparent text-sm outline-none text-bright placeholder:text-dim w-full"
        />
        {search && (
          <button onClick={() => setSearch("")} className="text-dim transition-colors"
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#f0f4ff"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#64748b"}>
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 relative">

        {/* Hotel Switcher */}
        <div className="relative">
          <button
            onClick={() => { setShowHotelSwitcher(!showHotelSwitcher); setShowNotifs(false); setShowSettings(false); }}
            className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-xl transition-all btn-ghost"
          >
            <Hotel className="w-3.5 h-3.5" /> Hotel Switcher
          </button>
          {showHotelSwitcher && (
            <div className="absolute right-0 top-10 w-64 z-50 overflow-hidden scrollbar-thin" style={{ ...dropdownStyle, maxHeight: "min(320px, calc(100vh - 180px))", overflowY: "auto" }}>
              <div className="px-4 py-2.5" style={dropdownHeaderStyle}>
                <p className="text-xs font-semibold text-dim uppercase tracking-wider">Select a Property</p>
              </div>
              <button
                onClick={() => { setShowHotelSwitcher(false); navigate("/hotels"); }}
                className="w-full text-left px-4 py-2.5 text-sm text-soft flex items-center gap-2 transition-colors"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                {...dropdownItemHover}
              >
                <Hotel className="w-3.5 h-3.5 text-dim shrink-0" />
                <span className="font-medium text-bright">All Properties</span>
              </button>
              {hotels.map((h) => (
                <button
                  key={h.id}
                  onClick={() => { setShowHotelSwitcher(false); navigate(`/hotel/${h.hotelId}`); }}
                  className="w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                  {...dropdownItemHover}
                >
                  <img src={h.img} alt={h.name} className="w-8 h-8 rounded-lg object-cover shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-bright truncate">{h.name}</p>
                    <p className="text-xs text-dim">
                      {h.location} ·{" "}
                      <span style={{ color: h.status === "Active" ? "#10b981" : "#f59e0b" }}>{h.status}</span>
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setShowNotifs(!showNotifs); setShowSettings(false); setShowHotelSwitcher(false); }}
            className="relative w-9 h-9 grid place-items-center rounded-xl transition-all"
            style={{ color: "#94a3b8" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)"; (e.currentTarget as HTMLElement).style.color = "#f0f4ff"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#94a3b8"; }}
          >
            <Bell className="w-4 h-4" />
            {(unreadCount > 0 || liveCount > 0) && (
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full text-white text-[9px] font-bold grid place-items-center"
                style={{ background: "#c0392b" }}>
                {unreadCount || liveCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <div className="absolute right-0 top-11 w-80 z-50 overflow-hidden" style={dropdownStyle}>
              <div className="flex items-center justify-between px-4 py-3" style={dropdownHeaderStyle}>
                <p className="text-sm font-semibold text-bright">Notifications</p>
                <div className="flex items-center gap-2">
                  {liveCount > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold animate-pulse"
                      style={{ background: "rgba(16,185,129,0.15)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }}>
                      {liveCount} live
                    </span>
                  )}
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: "rgba(192,57,43,0.15)", color: "#c0392b", border: "1px solid rgba(192,57,43,0.3)" }}>
                    {unreadCount} unread
                  </span>
                </div>
              </div>

              {/* Live alerts */}
              {liveAlerts.length > 0 && (
                <div style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="flex items-center justify-between px-4 py-2"
                    style={{ background: "rgba(16,185,129,0.08)" }}>
                    <p className="text-[10px] font-semibold text-emerald uppercase tracking-wider">⚡ Live Bookings</p>
                    <button onClick={clearLiveAlerts}
                      className="text-[10px] text-dim transition-colors"
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#e11d48"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#64748b"}>
                      Clear
                    </button>
                  </div>
                  {liveAlerts.slice(0, 3).map((a, i) => (
                    <button key={i} onClick={() => { setShowNotifs(false); navigate("/bookings"); }}
                      className="w-full text-left px-4 py-3 transition-colors"
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                      {...dropdownItemHover}>
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full grid place-items-center shrink-0 mt-0.5"
                          style={{ background: "rgba(16,185,129,0.2)", border: "1px solid rgba(16,185,129,0.3)" }}>
                          <span className="text-emerald text-xs font-bold">{a.userName.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-bright">{a.userName}</p>
                          <p className="text-xs text-dim">{a.hotelName} · ${a.amount.toLocaleString()}</p>
                          <span className="text-[10px] font-semibold text-emerald">New Booking ✓</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <div className="max-h-64 overflow-y-auto scrollbar-thin">
                {notifications.length === 0 ? (
                  <p className="text-sm text-dim text-center py-6">No notifications</p>
                ) : notifications.map((n) => (
                  <button key={n._id} onClick={() => openNotification(n)}
                    className="w-full text-left px-4 py-3 transition-colors"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                    {...dropdownItemHover}>
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full grid place-items-center shrink-0 mt-0.5"
                        style={{ background: n.isRead ? "rgba(100,116,139,0.12)" : "rgba(212,168,67,0.15)", border: "1px solid rgba(212,168,67,0.25)" }}>
                        <span className="text-gold text-xs font-bold">{n.type.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-semibold ${n.isRead ? "text-soft" : "text-bright"}`}>{n.message}</p>
                        <p className="text-[10px] text-dim capitalize">{n.type} · {timeAgo(n.createdAt)}</p>
                      </div>
                      {!n.isRead && <span className="ml-auto mt-1.5 w-2 h-2 rounded-full bg-gold shrink-0" />}
                    </div>
                  </button>
                ))}
              </div>
              <button onClick={() => { setShowNotifs(false); navigate("/bookings"); }}
                className="w-full py-2.5 text-xs font-semibold text-gold transition-colors"
                style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                View All Bookings →
              </button>
            </div>
          )}
        </div>

        {/* Live booking toast */}
        {toast && (
          <div className="fixed bottom-6 right-6 z-[100] w-80 rounded-2xl overflow-hidden animate-slide-up"
            style={{
              background: "#112240",
              border: "1px solid rgba(16,185,129,0.4)",
              boxShadow: "0 24px 80px rgba(0,0,0,0.6), 0 0 20px rgba(16,185,129,0.15)",
            }}>
            <div className="flex items-center gap-2 px-4 py-2"
              style={{ background: "rgba(16,185,129,0.15)", borderBottom: "1px solid rgba(16,185,129,0.2)" }}>
              <span className="text-emerald text-xs font-bold">⚡ New Booking</span>
              <button onClick={() => setToast(null)} className="ml-auto text-dim transition-colors"
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#f0f4ff"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#64748b"}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="px-4 py-3 flex items-start gap-3">
              <div className="w-9 h-9 rounded-full grid place-items-center shrink-0"
                style={{ background: "rgba(16,185,129,0.2)", border: "1px solid rgba(16,185,129,0.3)" }}>
                <span className="text-emerald text-sm font-bold">{toast.userName.charAt(0)}</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-bright">{toast.userName}</p>
                <p className="text-xs text-dim">{toast.hotelName} · {toast.roomType}</p>
                <p className="text-sm font-bold text-emerald mt-0.5">${toast.amount.toLocaleString()}</p>
              </div>
            </div>
            <button onClick={() => { setToast(null); navigate("/bookings"); }}
              className="w-full py-2 text-xs font-semibold text-gold transition-colors"
              style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
              View Booking →
            </button>
          </div>
        )}

        {notificationToast && (
          <div className="fixed bottom-6 right-6 z-[101] w-80 rounded-2xl overflow-hidden animate-slide-up"
            style={{ background: "#112240", border: "1px solid rgba(212,168,67,0.35)", boxShadow: "0 24px 80px rgba(0,0,0,0.6)" }}>
            <div className="px-4 py-3">
              <p className="text-xs font-semibold text-gold uppercase tracking-wider">Notification</p>
              <p className="text-sm font-semibold text-bright mt-1">{notificationToast.message}</p>
            </div>
          </div>
        )}

        {/* Profile / Settings */}
        <div className="relative">
          <button
            onClick={() => { setShowSettings(!showSettings); setShowNotifs(false); setShowHotelSwitcher(false); }}
            className="w-9 h-9 grid place-items-center rounded-xl transition-all"
            style={{ color: "#94a3b8" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)"; (e.currentTarget as HTMLElement).style.color = "#f0f4ff"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#94a3b8"; }}
          >
            <UserCircle className="w-5 h-5" />
          </button>

          {showSettings && (
            <div className="absolute right-0 top-11 w-52 z-50 overflow-hidden" style={dropdownStyle}>
              <div className="px-4 py-2.5" style={dropdownHeaderStyle}>
                <p className="text-xs font-semibold text-bright">{admin?.name || "Admin"}</p>
                <p className="text-xs text-dim">{admin?.email || ""}</p>
              </div>
              {[
                { label: "Profile",   path: "/profile" },
                { label: "Hotels",    path: "/hotels" },
                { label: "Rooms",     path: "/rooms" },
                { label: "Revenue",   path: "/revenue" },
                { label: "Analytics", path: "/analytics" },
                { label: "Insights",  path: "/insights" },
                { label: "Settings",  path: "/profile" },
              ].map((item) => (
                <button key={item.label}
                  onClick={() => { setShowSettings(false); navigate(item.path); }}
                  className="w-full text-left px-4 py-2.5 text-sm text-soft transition-colors"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"; (e.currentTarget as HTMLElement).style.color = "#f0f4ff"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#94a3b8"; }}
                >
                  {item.label}
                </button>
              ))}
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                <button
                  onClick={() => { setShowSettings(false); logout(); navigate("/login"); }}
                  className="w-full text-left px-4 py-2.5 text-sm transition-colors"
                  style={{ color: "#e11d48" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(225,29,72,0.08)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
