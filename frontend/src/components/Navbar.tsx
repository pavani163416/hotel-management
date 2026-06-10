import { useState, useEffect, useRef } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Bell, Hotel, UserCircle, LogOut, Mail, CheckCircle2, Building2, Heart } from "lucide-react";
import { useBooking } from "@/context/BookingContext";
import { useWishlist } from "@/context/WishlistContext";
import { AuthModal } from "@/components/AuthModal";
import CurrencySwitcher from "@/components/CurrencySwitcher";
import socket from "@/services/socket";
import api, { getNotifications, markNotificationRead, createNotification, API } from "@/services/api";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { AssistanceModal } from "@/components/AssistanceModal";

const links = [
  { to: "/", label: "Home" },
  { to: "/hotels", label: "Hotels" },
  { to: "/history", label: "History" },
  { to: "/support-centre", label: "Support" },
];

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

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, setUser, bookings, selectedHotel } = useBooking();
  const { wishlist } = useWishlist();

  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [requesting, setRequesting] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);
  const [assistanceOpen, setAssistanceOpen] = useState(false);
  const [activeRoomNo, setActiveRoomNo]   = useState("");
  const [activeFloorNo, setActiveFloorNo] = useState("");
  const [hasActiveStay, setHasActiveStay] = useState(false);
  // Track whether the modal was open so we know when it just closed
  const wasAuthOpen = useRef(false);

  // Auto-open sign-in when redirected from a protected route or via global event
  useEffect(() => {
    if ((location.state as any)?.openAuth && !user) {
      setAuthMode("signin");
      setAuthOpen(true);
    }
  }, [location.state, user]);

  useEffect(() => {
    const handleGlobalOpenAuth = () => {
      if (!user) {
        setAuthMode("signin");
        setAuthOpen(true);
      }
    };
    window.addEventListener("luxe_open_auth", handleGlobalOpenAuth);
    return () => window.removeEventListener("luxe_open_auth", handleGlobalOpenAuth);
  }, [user]);

  // When user logs in while modal was open → redirect to pending page
  useEffect(() => {
    if (user && wasAuthOpen.current) {
      wasAuthOpen.current = false;
      const redirect = sessionStorage.getItem("redirectAfterLogin");
      if (redirect) {
        sessionStorage.removeItem("redirectAfterLogin");
        navigate(redirect);
      }
    }
  }, [user, navigate]);

  const openAuth = (mode: "signin" | "signup") => {
    setAuthMode(mode);
    setAuthOpen(true);
    wasAuthOpen.current = true;
  };

  const handleAuthClose = () => {
    setAuthOpen(false);
    if (!user) {
      // User closed/cancelled without signing in — clear pending redirect
      wasAuthOpen.current = false;
      sessionStorage.removeItem("redirectAfterLogin");
    }
    // If user DID sign in, the useEffect above handles the redirect
  };

  const handleLogout = () => {
    localStorage.removeItem("luxe_customer_token");
    localStorage.removeItem("luxe_user");
    localStorage.removeItem("luxe_bookings");
    localStorage.removeItem("luxestay_wishlist");
    setUser(null);
    window.dispatchEvent(new Event("luxe_logout"));
    navigate("/");
  };

  const handleRequestAssistance = async (data: { message: string; roomNo: string; floorNo: string }) => {
    if (!user) return;

    setRequesting(true);
    try {

      // Always fetch the latest bookings from API to get the correct hotelId
      // (local context bookings may be stale or missing hotelId)
      let hotelId = selectedHotel?.id || "";
      try {
        const bRes = await api.get(`/bookings?guestEmail=${encodeURIComponent(user.email)}&limit=10`);
        const apiBookings: any[] = bRes.data?.data || [];
        // Find most recent confirmed booking — use room.hotelStringId (e.g. "h7") for routing
        const confirmed = apiBookings.find((b: any) => b.status === "Confirmed") || apiBookings[0];
        const stringId = confirmed?.room?.hotelStringId;   // "h7", "h1", etc.
        if (stringId) {
          hotelId = stringId;
        }
      } catch {
        // Fall back to local bookings
        const activeBooking = bookings.find((b) => b.status === "Confirmed") || bookings[0];
        hotelId = activeBooking?.hotel?.id || selectedHotel?.id || "";
      }

      // Build message with room and floor details if provided
      const parts: string[] = [];
      if (data.roomNo)  parts.push(`Room: ${data.roomNo}`);
      if (data.floorNo) parts.push(`Floor: ${data.floorNo}`);
      parts.push(data.message);
      const fullMessage = parts.join(" | ");

      const res = await api.post("/assistance", {
        hotelId: hotelId || "",
        userId: user.email,
        message: fullMessage,
      });
      const json = res.data;
      if (!json.success) throw new Error(json.message || "Failed to send request.");
      setRequestSuccess(true);
      toast.success("Assistance request sent to manager!");
      setTimeout(() => setRequestSuccess(false), 5000);
    } catch (err: any) {
      throw err;
    } finally {
      setRequesting(false);
    }
  };

  const normalizeDate = (value?: string) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    date.setHours(0, 0, 0, 0);
    return date;
  };

  const bookingIsActiveToday = (booking: any) => {
    const checkIn = normalizeDate(booking.checkIn || booking.search?.checkIn);
    const checkOut = normalizeDate(booking.checkOut || booking.search?.checkOut);
    if (!checkIn || !checkOut) return false;
    const today = normalizeDate(new Date().toISOString().slice(0, 10));
    return checkIn <= today && today <= checkOut;
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    if (!user?.email) {
      setNotifications([]);
      setHasActiveStay(false);
      return;
    }
    const scope = { role: "customer", userId: user.email };
    socket.emit("registerNotifications", scope);
    getNotifications(scope).then((res) => setNotifications(res?.data || [])).catch(() => {});

    // Check if user has an active (Confirmed/CheckedIn) booking from API
    api.get(`/bookings?guestEmail=${encodeURIComponent(user.email)}&limit=20`)
      .then((res) => {
        const active = (res.data?.data || []).some((b: any) =>
          (b.status === "Confirmed" || b.status === "CheckedIn") && bookingIsActiveToday(b)
        );
        setHasActiveStay(active || bookings.some((b) => (b.status === "Confirmed" || b.status === "CheckedIn") && bookingIsActiveToday(b)));
      })
      .catch(() => {
        setHasActiveStay(bookings.some((b) => (b.status === "Confirmed" || b.status === "CheckedIn") && bookingIsActiveToday(b)));
      });

    const onNotification = (data: NotificationItem) => {
      setNotifications((prev) => [data, ...prev.filter((n) => n._id !== data._id)].slice(0, 50));
      toast(data.message);
    };
    socket.on("notification", onNotification);
    return () => {
      socket.off("notification", onNotification);
    };
  }, [user?.email, bookings]);

  const openNotification = (n: NotificationItem) => {
    if (!n.isRead) {
      setNotifications((prev) => prev.map((item) => item._id === n._id ? { ...item, isRead: true } : item));
      markNotificationRead(n._id).catch(() => {});
    }
    setShowNotifications(false);
    
    const msg = n.message.toLowerCase();
    if (n.type === "booking" || msg.includes("booking") || msg.includes("confirm") || msg.includes("cancel")) {
      navigate("/history");
    } else if (
      msg.includes("owner") || 
      msg.includes("application") || 
      msg.includes("approved") || 
      msg.includes("rejected") || 
      msg.includes("partner")
    ) {
      navigate("/owner-portal");
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-md border-b border-border">
      <div className="container flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2 font-display font-bold text-lg text-primary">
          <span className="grid place-items-center w-8 h-8 rounded-lg bg-primary text-primary-foreground">
            <Hotel className="w-4 h-4" />
          </span>
          LuxeStay
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.to === "/"}
              className={({ isActive }) =>
                `relative px-4 py-2 text-sm font-medium transition-base ${isActive ? "text-primary" : "text-muted-foreground hover:text-primary"}`
              }>
              {({ isActive }) => (
                <>
                  {l.label}
                  {isActive && <span className="absolute left-4 right-4 -bottom-0.5 h-0.5 bg-accent rounded-full" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <CurrencySwitcher />
          <button
            onClick={() => navigate('/wishlist')}
            className="relative w-9 h-9 grid place-items-center rounded-full hover:bg-accent/5 transition-base border border-transparent hover:border-border"
            aria-label="Wishlist"
          >
            <Heart className="w-4 h-4 text-muted-foreground" />
          </button>
          {user ? (
            <>
              <div className="relative">
                <button
                  onClick={() => setShowNotifications((v) => !v)}
                  className="relative w-9 h-9 grid place-items-center rounded-full hover:bg-accent/5 transition-base border border-transparent hover:border-border"
                  aria-label="Notifications"
                >
                  <Bell className="w-4 h-4 text-muted-foreground" />
                  {unreadCount > 0 && (
                    <span className="absolute top-0.5 right-0.5 min-w-4 h-4 px-1 rounded-full bg-accent text-accent-foreground text-[10px] font-bold grid place-items-center">
                      {unreadCount}
                    </span>
                  )}
                </button>
                {showNotifications && (
                  <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-xl border border-border bg-card shadow-elegant">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                      <p className="text-sm font-semibold text-primary">Notifications</p>
                      <span className="text-xs text-muted-foreground">{unreadCount} unread</span>
                    </div>
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="py-8 text-center text-sm text-muted-foreground">No notifications</p>
                      ) : notifications.map((n) => (
                        <button
                          key={n._id}
                          onClick={() => openNotification(n)}
                          className="w-full text-left px-4 py-3 border-b border-border last:border-0 hover:bg-secondary transition-base"
                        >
                          <div className="flex items-start gap-3">
                            <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${n.isRead ? "bg-border" : "bg-accent"}`} />
                            <div>
                              <p className={`text-sm ${n.isRead ? "text-muted-foreground" : "text-primary font-semibold"}`}>{n.message}</p>
                              <p className="text-xs text-muted-foreground mt-0.5 capitalize">{n.type} · {timeAgo(n.createdAt)}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-accent/5 transition-base border border-transparent hover:border-border outline-none">
                    <span className="font-semibold text-sm text-primary">{user.name.split(" ")[0]}</span>
                    <UserCircle className="w-7 h-7 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="w-full cursor-pointer">Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/owner-portal" className="w-full cursor-pointer flex items-center gap-1.5 text-primary hover:text-accent font-medium">
                      <Building2 className="w-3.5 h-3.5" /> List Your Property
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={async () => {
                      if (!hasActiveStay) return;
                      // Pre-fetch room number and floor from active booking
                      if (user?.email) {
                        try {
                          const token = localStorage.getItem("luxe_customer_token");
                          const headers: Record<string, string> = { "Content-Type": "application/json" };
                          if (token) headers["Authorization"] = `Bearer ${token}`;
                          const bRes = await fetch(`${API}/bookings?guestEmail=${encodeURIComponent(user.email)}&limit=5`, { headers });
                          const bJson = await bRes.json();
                          const apiBookings: any[] = bJson?.data || [];
                          const confirmed = apiBookings.find((b: any) => b.status === "Confirmed") || apiBookings[0];
                          if (confirmed?.room?.roomNumber) {
                            setActiveRoomNo(confirmed.room.roomNumber);
                            const match = confirmed.room.roomNumber.match(/(\d+)/);
                            const roomNum = match ? match[1] : "";
                            setActiveFloorNo(roomNum.length >= 3 ? roomNum[0] : "");
                          } else {
                            setActiveRoomNo("");
                            setActiveFloorNo("");
                          }
                        } catch {
                          setActiveRoomNo("");
                          setActiveFloorNo("");
                        }
                      }
                      setAssistanceOpen(true);
                    }}
                    disabled={requesting || requestSuccess || !hasActiveStay}
                    className={hasActiveStay ? "cursor-pointer" : "cursor-not-allowed opacity-50"}
                    title={!hasActiveStay ? "No active booking — assistance is only available during your stay" : undefined}
                  >
                    {requestSuccess ? (
                      <><CheckCircle2 className="w-4 h-4 mr-2 text-green-500" /> Sent!</>
                    ) : (
                      <><Mail className="w-4 h-4 mr-2" /> {requesting ? "Sending..." : "Request Assistance"}</>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-destructive cursor-pointer focus:text-destructive focus:bg-destructive/10"
                  >
                    <LogOut className="w-4 h-4 mr-2" /> Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <button
                onClick={() => openAuth("signin")}
                className="px-5 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-base"
              >
                Sign In
              </button>
              <button
                onClick={() => openAuth("signup")}
                className="px-5 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-base"
              >
                Sign Up
              </button>
            </>
          )}
        </div>
      </div>

      <AuthModal
        isOpen={authOpen}
        onClose={handleAuthClose}
        defaultMode={authMode}
      />
      <AssistanceModal
        isOpen={assistanceOpen}
        onClose={() => setAssistanceOpen(false)}
        onSubmit={handleRequestAssistance}
        requesting={requesting}
        defaultRoomNo={activeRoomNo}
        defaultFloorNo={activeFloorNo}
      />
    </header>

  );
};

export default Navbar;
