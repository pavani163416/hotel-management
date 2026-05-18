/**
 * ManagerLayout — tab-based top-nav layout for Manager role users.
 * Used when admin?.role === "Manager" after login.
 * Displays the manager's assigned hotel name in the navbar.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Building2, LayoutDashboard, BedDouble, CalendarCheck,
  Presentation, DollarSign, Tag, ChevronDown, LogOut, User,
  Bell, Wifi, WifiOff, Map, Sparkles, BarChart2, ShieldAlert,
} from "lucide-react";
import { useAdmin } from "@/context/AdminContext";
import socket from "@/services/socket";
import { checkHotelAccess, getNotifications, markNotificationRead } from "@/services/api";

const TABS = [
  { id: "dashboard",    label: "Dashboard",    icon: LayoutDashboard, path: "/m/dashboard" },
  { id: "floor-map",    label: "Floor Map",    icon: Map,             path: "/m/floor-map" },
  { id: "bookings",     label: "Bookings",     icon: CalendarCheck,   path: "/m/bookings" },
  { id: "rooms",        label: "Rooms",        icon: BedDouble,       path: "/m/rooms" },
  { id: "financials",   label: "Financials",   icon: DollarSign,      path: "/m/financials" },
  { id: "hotels",       label: "Hotels",       icon: BarChart2,       path: "/m/hotels-overview" },
  { id: "halls",        label: "Halls",        icon: Presentation,    path: "/m/halls" },
  { id: "pricing",      label: "Pricing",      icon: Tag,             path: "/m/pricing" },
];

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { admin, logout } = useAdmin();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen]     = useState(false);
  const [connected, setConnected]     = useState(socket.connected);
  const [notifications, setNotifications] = useState<{ _id?: string; id?: string; message?: string; msg?: string; type?: string; isRead?: boolean; createdAt?: string; time?: string }[]>([]);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [notifDetail, setNotifDetail] = useState<any | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef   = useRef<HTMLDivElement>(null);

  // Resolved hotel name: prefer assignedHotelName, fall back to hotelName
  const hotelDisplayName =
    admin?.assignedHotelName || admin?.hotelName || "LuxeStay";
  const scopedHotelId = admin?.assignedHotelId || admin?.hotelId;
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  /**
   * Guard: called when a manager tries to switch to a different hotel.
   * Shows the Emerald Red error toast if access is denied.
   */
  const guardHotelAccess = useCallback(async (requestedHotelId: string) => {
    const assignedId = admin?.assignedHotelId || admin?.hotelId;
    if (!assignedId || requestedHotelId === assignedId) return true;

    try {
      await checkHotelAccess(requestedHotelId);
      return true;
    } catch {
      setAccessError(
        "Unauthorized: You do not have management access to this property."
      );
      setTimeout(() => setAccessError(null), 5000);
      return false;
    }
  }, [admin]);

  const activeTab = TABS.find((t) => {
    if (t.path === "/m/dashboard") return location.pathname === "/m/dashboard";
    return location.pathname === t.path || location.pathname.startsWith(t.path + "/");
  })?.id || "dashboard";

  useEffect(() => {
    const onConnect    = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onBooking    = (data: any) => {
      setNotifications((prev) => [
        { id: Date.now().toString(), msg: `New booking: ${data.guestName || "Guest"} — ${data.roomType || "Room"}`, time: "just now" },
        ...prev.slice(0, 9),
      ]);
    };
    socket.on("connect",    onConnect);
    socket.on("disconnect", onDisconnect);
    return () => {
      socket.off("connect",    onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, []);

  useEffect(() => {
    if (!scopedHotelId) return;
    const scope = { role: "manager", hotelId: scopedHotelId };
    socket.emit("registerNotifications", scope);
    getNotifications(scope).then((res: any) => setNotifications(res?.data || [])).catch(() => {});
    const onNotification = (data: any) => {
      setNotifications((prev) => [data, ...prev.filter((n) => n._id !== data._id)].slice(0, 50));
      // Broadcast to dashboard Alert Center via custom DOM event
      window.dispatchEvent(new CustomEvent("luxe:notification", { detail: data }));
    };
    socket.on("notification", onNotification);
    return () => {
      socket.off("notification", onNotification);
    };
  }, [scopedHotelId]);

  const openNotification = (n: { _id?: string; type?: string; isRead?: boolean; message?: string; msg?: string; createdAt?: string; time?: string }) => {
    if (n._id && !n.isRead) {
      setNotifications((prev) => prev.map((item) => item._id === n._id ? { ...item, isRead: true } : item));
      markNotificationRead(n._id).catch(() => {});
    }
    setNotifOpen(false);
    setNotifDetail(n);
  };

  const timeAgo = (iso?: string, fallback = "just now") => {
    if (!iso) return fallback;
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
      if (notifRef.current   && !notifRef.current.contains(e.target as Node))   setNotifOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(180deg, #0a1628 0%, #07101e 100%)" }}>

      {/* ── Top Navbar ── */}
      <header className="sticky top-0 z-40" style={{
        background: "rgba(10,22,40,0.92)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}>
        <div className="max-w-screen-2xl mx-auto px-6 h-16 flex items-center justify-between">

          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl grid place-items-center"
              style={{ background: "linear-gradient(135deg, rgba(212,168,67,0.2) 0%, rgba(212,168,67,0.08) 100%)", border: "1px solid rgba(212,168,67,0.3)" }}>
              <Building2 className="w-4 h-4 text-gold" />
            </div>
            <div>
              <p className="text-bright font-semibold text-sm leading-tight">
                {hotelDisplayName}
              </p>
              <p className="text-dim text-xs leading-tight">Manager Portal</p>
            </div>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            {/* Live indicator */}
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
              style={{
                background: connected ? "rgba(16,185,129,0.12)" : "rgba(225,29,72,0.12)",
                border: connected ? "1px solid rgba(16,185,129,0.25)" : "1px solid rgba(225,29,72,0.25)",
                color: connected ? "#10b981" : "#e11d48",
              }}>
              {connected ? <><Wifi className="w-3 h-3" /> Live</> : <><WifiOff className="w-3 h-3" /> Offline</>}
            </div>

            {/* Notifications */}
            <div ref={notifRef} className="relative">
              <button onClick={() => setNotifOpen(!notifOpen)}
                className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                style={{ color: "#94a3b8" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)"; (e.currentTarget as HTMLElement).style.color = "#f0f4ff"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#94a3b8"; }}>
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full animate-pulse" style={{ background: "#c0392b" }} />
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl shadow-modal animate-slide-up overflow-hidden"
                  style={{ background: "#112240", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                    <span className="font-semibold text-bright text-sm">Notifications</span>
                    <span className="text-xs text-dim">{unreadCount} unread</span>
                  </div>
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-dim">No new notifications</div>
                  ) : (
                    <div className="divide-y max-h-72 overflow-y-auto scrollbar-thin" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                      {notifications.map((n) => (
                        <button key={n._id || n.id} onClick={() => openNotification(n)} className="w-full text-left px-4 py-3 transition-colors"
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)"}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                          <div className="flex items-start gap-2.5">
                            {n.type === "assistance" && (
                              <span className="mt-0.5 shrink-0 text-xs px-1.5 py-0.5 rounded font-bold"
                                style={{ background: "rgba(212,168,67,0.2)", color: "#d4a843", border: "1px solid rgba(212,168,67,0.3)" }}>
                                HELP
                              </span>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm ${n.isRead ? "text-soft" : "text-bright font-semibold"}`}>{n.message || n.msg}</p>
                              <p className="text-xs text-dim mt-0.5 capitalize">{n.type || "booking"} · {timeAgo(n.createdAt, n.time)}</p>
                            </div>
                            {!n.isRead && (
                              <span className="mt-1.5 w-2 h-2 rounded-full shrink-0 animate-pulse" style={{ background: "#c0392b" }} />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Profile */}
            <div ref={profileRef} className="relative">
              <button onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl transition-all"
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                <div className="w-7 h-7 rounded-lg grid place-items-center"
                  style={{ background: "linear-gradient(135deg, rgba(212,168,67,0.25) 0%, rgba(212,168,67,0.1) 100%)", border: "1px solid rgba(212,168,67,0.35)" }}>
                  <span className="text-gold text-xs font-bold">{admin?.name?.charAt(0) || "M"}</span>
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-bright text-xs font-semibold leading-tight">{admin?.name || "Manager"}</p>
                  <p className="text-dim text-xs leading-tight">{admin?.role || "Manager"}</p>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-dim transition-transform ${profileOpen ? "rotate-180" : ""}`} />
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl shadow-modal animate-slide-up overflow-hidden"
                  style={{ background: "#112240", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <div className="px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                    <p className="font-semibold text-bright text-sm">{admin?.name}</p>
                    <p className="text-xs text-dim">{admin?.email}</p>
                  </div>
                  <div className="p-1.5">
                    <button onClick={() => { setProfileOpen(false); navigate("/m/profile"); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-soft transition-colors"
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; (e.currentTarget as HTMLElement).style.color = "#f0f4ff"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "#94a3b8"; }}>
                      <User className="w-4 h-4" /> My Profile
                    </button>
                    <div className="my-1" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }} />
                    <button onClick={() => { logout(); navigate("/login"); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors"
                      style={{ color: "#e11d48" }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(225,29,72,0.1)"}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}>
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Tab Navigation ── */}
        <div className="max-w-screen-2xl mx-auto px-6" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <nav className="flex items-center gap-0.5 -mb-px overflow-x-auto scrollbar-thin">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => navigate(tab.path)}
                  className="flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap"
                  style={{ color: isActive ? "#f0f4ff" : "#64748b", borderColor: isActive ? "#c0392b" : "transparent" }}
                  onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.color = "#94a3b8"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.15)"; } }}
                  onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.color = "#64748b"; (e.currentTarget as HTMLElement).style.borderColor = "transparent"; } }}>
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* ── Page Content ── */}
      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-6 py-6 animate-fade-in">
        {children}
      </main>

      {/* ── Unauthorized Hotel Access Toast ── */}
      {accessError && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl animate-slide-up"
          style={{
            background: "linear-gradient(135deg, #1a0a0a 0%, #2d0f0f 100%)",
            border: "1px solid rgba(192,57,43,0.5)",
            boxShadow: "0 8px 32px rgba(192,57,43,0.4)",
            minWidth: "360px",
            maxWidth: "520px",
          }}
        >
          <div
            className="w-9 h-9 rounded-xl grid place-items-center shrink-0"
            style={{ background: "rgba(192,57,43,0.2)", border: "1px solid rgba(192,57,43,0.4)" }}
          >
            <ShieldAlert className="w-5 h-5" style={{ color: "#e74c3c" }} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold" style={{ color: "#f0f4ff" }}>
              Access Denied
            </p>
            <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>
              {accessError}
            </p>
          </div>
          <button
            onClick={() => setAccessError(null)}
            className="text-xs shrink-0 transition-colors"
            style={{ color: "#64748b" }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#e74c3c"}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#64748b"}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Notification Detail Modal ── */}
      {notifDetail && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
          onClick={() => setNotifDetail(null)}>
          <div className="w-full max-w-md rounded-2xl overflow-hidden"
            style={{ background: "#112240", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 24px 64px rgba(0,0,0,0.6)" }}
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl grid place-items-center"
                  style={{
                    background: notifDetail.type === "manager" ? "rgba(212,168,67,0.2)" : "rgba(192,57,43,0.2)",
                    border: notifDetail.type === "manager" ? "1px solid rgba(212,168,67,0.4)" : "1px solid rgba(192,57,43,0.4)",
                  }}>
                  <Bell className="w-4 h-4" style={{ color: notifDetail.type === "manager" ? "#d4a843" : "#c0392b" }} />
                </div>
                <div>
                  <p className="text-sm font-bold text-bright">
                    {notifDetail.type === "manager" ? "Admin Alert"
                      : notifDetail.type === "booking" ? "Booking Notification"
                      : notifDetail.type === "assistance" ? "Guest Assistance Request"
                      : notifDetail.type === "price" ? "Pricing Update"
                      : notifDetail.type === "system" ? "System Notification"
                      : "Notification"}
                  </p>
                  <p className="text-xs text-dim capitalize">{notifDetail.type || "notification"}</p>
                </div>
              </div>
              <button onClick={() => setNotifDetail(null)}
                className="w-7 h-7 rounded-lg grid place-items-center text-dim transition-colors"
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#f0f4ff"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#64748b"}>
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              {/* Message */}
              <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <p className="text-xs text-dim uppercase tracking-wider font-semibold mb-2">Message</p>
                <p className="text-sm text-bright leading-relaxed">{notifDetail.message || notifDetail.msg}</p>
              </div>

              {/* Details grid */}
              <div className="space-y-0 rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
                {notifDetail.type && (
                  <NRow label="Type" value={notifDetail.type.charAt(0).toUpperCase() + notifDetail.type.slice(1)} />
                )}
                {(notifDetail.hotelId) && (
                  <NRow label="Hotel ID" value={notifDetail.hotelId} />
                )}
                <NRow label="Status" value={notifDetail.isRead ? "Read" : "Unread"} highlight={!notifDetail.isRead} />
                {(notifDetail.createdAt || notifDetail.time) && (
                  <NRow label="Received"
                    value={notifDetail.createdAt
                      ? new Date(notifDetail.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
                      : notifDetail.time} />
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-5 flex gap-3">
              {/* Navigate to relevant page if actionable */}
              {(notifDetail.type === "booking" || notifDetail.type === "assistance") && (
                <button onClick={() => { setNotifDetail(null); navigate("/m/bookings"); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                  style={{ background: "rgba(212,168,67,0.15)", color: "#d4a843", border: "1px solid rgba(212,168,67,0.3)" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(212,168,67,0.25)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(212,168,67,0.15)"}>
                  View Bookings
                </button>
              )}
              {notifDetail.type === "price" && (
                <button onClick={() => { setNotifDetail(null); navigate("/m/pricing"); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                  style={{ background: "rgba(212,168,67,0.15)", color: "#d4a843", border: "1px solid rgba(212,168,67,0.3)" }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(212,168,67,0.25)"}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(212,168,67,0.15)"}>
                  View Pricing
                </button>
              )}
              <button onClick={() => setNotifDetail(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                style={{ background: "rgba(255,255,255,0.06)", color: "#f0f4ff", border: "1px solid rgba(255,255,255,0.1)" }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)"}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const NRow = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
  <div className="flex items-center justify-between px-4 py-3"
    style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
    <span className="text-xs text-dim">{label}</span>
    <span className="text-xs font-semibold" style={{ color: highlight ? "#c0392b" : "#94a3b8" }}>{value}</span>
  </div>
);
