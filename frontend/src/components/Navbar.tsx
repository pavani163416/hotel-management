import { useState, useEffect, useRef } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Bell, Hotel, UserCircle, LogOut, Mail, CheckCircle2, Building2, Heart, Menu, X } from "lucide-react";
import { useBooking } from "@/context/BookingContext";
import { useWishlist } from "@/context/WishlistContext";
import { AuthModal } from "@/components/AuthModal";
import CurrencySwitcher from "@/components/CurrencySwitcher";
import socket from "@/services/socket";
import api, { getNotifications, markNotificationRead, createNotification, API, DEFAULT_PAGINATION_LIMIT } from "@/services/api";
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Track whether the modal was open so we know when it just closed
  const wasAuthOpen = useRef(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileLogoRef = useRef<HTMLButtonElement>(null);

  const handleMenuNavigation = (route: string) => {
    setMobileMenuOpen(false);
    navigate(route);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (
        mobileMenuOpen &&
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target as Node) &&
        mobileLogoRef.current &&
        !mobileLogoRef.current.contains(event.target as Node)
      ) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

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

  const handleAuthClose = (success?: boolean) => {
    setAuthOpen(false);
    if (!success) {
      // User closed/cancelled without signing in — clear pending redirect
      wasAuthOpen.current = false;
      sessionStorage.removeItem("redirectAfterLogin");
    }
    // If user DID sign in (success is true), the useEffect above handles the redirect
  };

  const handleLogout = async () => {
    try { await api.post("/auth/logout"); } catch { /* best-effort */ }
    localStorage.removeItem("luxe_user");
    localStorage.removeItem("luxe_bookings");
    localStorage.removeItem("athithigriha_wishlist");
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
        const bRes = await api.get(`/bookings?guestEmail=${encodeURIComponent(user.email)}&limit=${DEFAULT_PAGINATION_LIMIT}`);
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

    const controller = new AbortController();
    // Check if user has an active (Confirmed/CheckedIn) booking from API
    api.get(`/bookings?guestEmail=${encodeURIComponent(user.email)}&limit=${DEFAULT_PAGINATION_LIMIT}`, { signal: controller.signal })
      .then((res) => {
        const active = (res.data?.data || []).some((b: any) =>
          (b.status === "Confirmed" || b.status === "CheckedIn") && bookingIsActiveToday(b)
        );
        setHasActiveStay(active || bookings.some((b) => (b.status === "Confirmed" || b.status === "CheckedIn") && bookingIsActiveToday(b)));
      })
      .catch((err) => {
        if (err.name === "CanceledError" || err.message === "canceled") return;
        setHasActiveStay(bookings.some((b) => (b.status === "Confirmed" || b.status === "CheckedIn") && bookingIsActiveToday(b)));
      });

    const onNotification = (data: NotificationItem) => {
      setNotifications((prev) => [data, ...prev.filter((n) => n._id !== data._id)].slice(0, 50));
      toast(data.message);
    };
    socket.on("notification", onNotification);
    return () => {
      socket.off("notification", onNotification);
      controller.abort();
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
        
        {/* Logo (Acts as menu toggle on mobile, normal link on desktop) */}
        <div className="flex items-center">
          {/* Mobile Logo Button (opens menu drawer) */}
          <button 
            ref={mobileLogoRef}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex items-center gap-2 font-display font-bold text-lg text-primary md:hidden min-h-[44px] outline-none"
            aria-label="Toggle menu"
          >
            <span className="grid place-items-center w-8 h-8 rounded-lg bg-primary text-primary-foreground shrink-0">
              <Hotel className="w-4 h-4" />
            </span>
            <span>AthithiGriha</span>
          </button>

          {/* Desktop Logo Link */}
          <Link to="/" className="hidden md:flex items-center justify-start gap-2 font-display font-bold text-lg text-primary md:w-auto">
            <span className="grid place-items-center w-8 h-8 rounded-lg bg-primary text-primary-foreground shrink-0">
              <Hotel className="w-4 h-4" />
            </span>
            <span>AthithiGriha</span>
          </Link>
        </div>

        {/* Desktop Links */}
        <nav className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.to === "/"}
              className={({ isActive }) =>
                `relative px-4 py-2 text-sm font-medium transition-base min-h-[44px] flex items-center ${isActive ? "text-primary" : "text-muted-foreground hover:text-primary"}`
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

        {/* Right Actions */}
        <div className="flex items-center justify-end gap-1 md:gap-3 w-1/4 md:w-auto">
          <div className="hidden md:block">
            <CurrencySwitcher />
          </div>
          <button
            onClick={() => navigate('/wishlist')}
            className="hidden md:grid relative w-[44px] h-[44px] place-items-center rounded-full hover:bg-accent/5 transition-base border border-transparent hover:border-border"
            aria-label="Wishlist"
          >
            <Heart className="w-5 h-5 text-muted-foreground" />
          </button>
          
          {user ? (
            <>
              {/* Notifications */}
              <div className="relative flex items-center justify-center" ref={notificationRef}>
                <button
                  onClick={() => setShowNotifications((v) => !v)}
                  className="relative w-[44px] h-[44px] flex items-center justify-center rounded-full hover:bg-accent/5 transition-base border border-transparent hover:border-border"
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5 text-muted-foreground" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-accent-foreground text-[10px] font-bold grid place-items-center">
                      {unreadCount}
                    </span>
                  )}
                </button>
                {showNotifications && (
                  <div className="absolute right-0 top-12 z-50 w-[90vw] max-w-sm overflow-hidden rounded-xl border border-border bg-card shadow-elegant">
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
                          className="w-full text-left px-4 py-3 border-b border-border last:border-0 hover:bg-secondary transition-base min-h-[44px]"
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

              {/* Desktop User Avatar (hidden on mobile, but user wants avatar on right. "Profile Avatar OR Guest Icon") */}
              {/* Since we need avatar on mobile, we show it! */}
              <div className="hidden md:block">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-accent/5 transition-base border border-transparent hover:border-border outline-none min-h-[44px]">
                      <span className="font-semibold text-sm text-primary">{user.name.split(" ")[0]}</span>
                      <UserCircle className="w-7 h-7 text-muted-foreground shrink-0" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="w-full cursor-pointer min-h-[44px] flex items-center">
                        <UserCircle className="w-4 h-4 mr-2" /> Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/halls" className="w-full cursor-pointer min-h-[44px] flex items-center">
                        <Building2 className="w-4 h-4 mr-2" /> Book a Hall
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/owner-portal" className="w-full cursor-pointer flex items-center text-primary hover:text-accent font-medium min-h-[44px]">
                        <Building2 className="w-4 h-4 mr-2" /> List Your Property
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={async () => {
                        if (!hasActiveStay) return;
                        if (user?.email) {
                          try {
                            const bRes = await api.get(`/bookings?guestEmail=${encodeURIComponent(user.email)}&limit=${DEFAULT_PAGINATION_LIMIT}`);
                            const apiBookings: any[] = bRes.data?.data || [];
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
                      className={`min-h-[44px] ${hasActiveStay ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`}
                      title={!hasActiveStay ? "Assistance available during stay" : undefined}
                    >
                      {requestSuccess ? (
                        <><CheckCircle2 className="w-4 h-4 mr-2 text-green-500" /> Sent!</>
                      ) : (
                        <><Mail className="w-4 h-4 mr-2" /> {requesting ? "Sending..." : "Request Assistance"}</>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="text-destructive cursor-pointer focus:text-destructive focus:bg-destructive/10 min-h-[44px]"
                    >
                      <LogOut className="w-4 h-4 mr-2" /> Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Mobile Avatar (just triggers drawer or acts as avatar) */}
              <button 
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden flex items-center justify-center min-w-[44px] min-h-[44px] -mr-2"
                aria-label="Open menu"
              >
                <UserCircle className="w-6 h-6 text-muted-foreground" />
              </button>
            </>
          ) : (
            <>
              {/* Desktop Sign In / Sign Up */}
              <div className="hidden md:flex items-center gap-2">
                <button
                  onClick={() => openAuth("signin")}
                  className="px-5 py-2 min-h-[44px] text-sm font-semibold rounded-lg text-primary hover:bg-secondary transition-base"
                >
                  Sign In
                </button>
                <button
                  onClick={() => openAuth("signup")}
                  className="px-5 py-2 min-h-[44px] text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-base"
                >
                  Sign Up
                </button>
              </div>
              
              {/* Mobile Guest Avatar */}
              <button 
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden flex items-center justify-center min-w-[44px] min-h-[44px] -mr-2"
                aria-label="Open menu"
              >
                <UserCircle className="w-6 h-6 text-muted-foreground" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop below the header */}
          <div 
            className="fixed inset-x-0 bottom-0 top-16 z-40 bg-black/20 backdrop-blur-sm md:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div 
            ref={mobileMenuRef}
            className="absolute top-16 left-0 right-0 z-50 bg-background border-b border-border shadow-luxe md:hidden flex flex-col py-4 px-6 gap-2 max-h-[80dvh] overflow-y-auto"
          >
            {user && (
              <div className="px-3 py-3 mb-2 bg-secondary/50 rounded-xl">
                <p className="font-semibold text-primary text-base">{user.name}</p>
                <p className="text-sm text-muted-foreground truncate">{user.email}</p>
              </div>
            )}

            {/* Common Links */}
            <button onClick={() => handleMenuNavigation("/")} className={`px-4 py-3 min-h-[44px] flex items-center text-base font-semibold rounded-lg transition-base ${location.pathname === "/" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-primary"}`}>Home</button>
            <button onClick={() => handleMenuNavigation("/hotels")} className={`px-4 py-3 min-h-[44px] flex items-center text-base font-semibold rounded-lg transition-base ${location.pathname === "/hotels" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-primary"}`}>Hotels</button>

            {/* Authenticated Links */}
            {user && (
              <>
                <button onClick={() => handleMenuNavigation("/halls")} className={`px-4 py-3 min-h-[44px] flex items-center text-base font-semibold rounded-lg transition-base ${location.pathname === "/halls" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-primary"}`}>Book a Hall</button>
                <button onClick={() => handleMenuNavigation("/history")} className={`px-4 py-3 min-h-[44px] flex items-center text-base font-semibold rounded-lg transition-base ${location.pathname === "/history" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-primary"}`}>History</button>
              </>
            )}

            {/* Common Links 2 */}
            <button onClick={() => handleMenuNavigation("/wishlist")} className="px-4 py-3 min-h-[44px] flex items-center justify-between text-base font-semibold text-muted-foreground hover:bg-secondary hover:text-primary rounded-lg transition-base">
              Wishlist <Heart className="w-4 h-4" />
            </button>

            {user && (
              <button onClick={() => { setMobileMenuOpen(false); setShowNotifications(true); }} className="px-4 py-3 min-h-[44px] flex items-center justify-between text-base font-semibold text-muted-foreground hover:bg-secondary hover:text-primary rounded-lg transition-base">
                Notifications
                {unreadCount > 0 && <span className="bg-accent text-accent-foreground text-xs font-bold px-2 py-0.5 rounded-full">{unreadCount}</span>}
              </button>
            )}

            <button onClick={() => handleMenuNavigation("/support-centre")} className={`px-4 py-3 min-h-[44px] flex items-center text-base font-semibold rounded-lg transition-base ${location.pathname === "/support-centre" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary hover:text-primary"}`}>Support</button>

            {!user && (
              <button onClick={() => handleMenuNavigation("/contact")} className="px-4 py-3 min-h-[44px] flex items-center text-base font-semibold text-muted-foreground hover:bg-secondary hover:text-primary rounded-lg transition-base">
                Contact Admin
              </button>
            )}

            <div className="my-1 h-px bg-border/50" />

            {/* Bottom Actions */}
            {user ? (
              <>
                <button onClick={() => handleMenuNavigation("/profile")} className="px-4 py-3 min-h-[44px] flex items-center text-base font-semibold text-muted-foreground hover:bg-secondary hover:text-primary rounded-lg transition-base">
                  Profile
                </button>
                <button onClick={() => handleMenuNavigation("/owner-portal")} className="px-4 py-3 min-h-[44px] flex items-center text-base font-semibold text-muted-foreground hover:bg-secondary hover:text-primary rounded-lg transition-base">
                  List Your Property
                </button>
                <button onClick={() => handleMenuNavigation("/history")} className="px-4 py-3 min-h-[44px] flex items-center text-base font-semibold text-muted-foreground hover:bg-secondary hover:text-primary rounded-lg transition-base">
                  My Bookings
                </button>
                <button onClick={() => { setMobileMenuOpen(false); handleLogout(); }} className="px-4 py-3 min-h-[44px] flex items-center text-base font-semibold text-destructive hover:bg-destructive/10 rounded-lg transition-base mt-1">
                  Log out
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2 pt-2">
                <button onClick={() => { setMobileMenuOpen(false); openAuth("signin"); }} className="w-full min-h-[44px] flex items-center justify-center font-bold rounded-lg bg-secondary text-primary hover:bg-secondary/80 transition-base">
                  Sign In
                </button>
                <button onClick={() => { setMobileMenuOpen(false); openAuth("signup"); }} className="w-full min-h-[44px] flex items-center justify-center font-bold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-base">
                  Sign Up
                </button>
              </div>
            )}

            <div className="my-1 h-px bg-border/50" />
            
            <div className="px-4 py-3 min-h-[44px] flex items-center justify-between">
              <span className="text-base font-semibold text-muted-foreground">Currency</span>
              <CurrencySwitcher />
            </div>
          </div>
        </>
      )}

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
