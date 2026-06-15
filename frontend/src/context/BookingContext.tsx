import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import type { Hotel, Room } from "@/data/hotels";
import api, { API } from "../services/api";
import socket from "@/services/socket";
import { toast } from "sonner";

const HOTEL_CACHE_KEY = "luxe_hotels_cache";

function mapHotel(h: any): Hotel {
  const actualReviews = Array.isArray(h.reviews) ? h.reviews : [];
  const actualReviewCount = actualReviews.length;
  const computedRating = actualReviewCount > 0
    ? Number((actualReviews.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / actualReviewCount).toFixed(1))
    : undefined;

  return {
    id: h.hotelId,
    name: h.name,
    location: h.location,
    city: h.city,
    description: h.description || "",
    image: h.image || "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80",
    gallery: h.gallery?.length ? h.gallery : [h.image || "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80"],
    reviewCount: actualReviewCount > 0
      ? actualReviewCount
      : (typeof h.reviewCount === "number" ? h.reviewCount : 0),
    activeBookings: typeof h.activeBookings === "number" ? h.activeBookings : 0,
    rating: typeof h.rating === "number" ? h.rating : computedRating,
    pricePerNight: h.pricePerNight || 500,
    originalPrice: h.originalPrice,
    discountPct: h.discountPct,
    isDeal: h.isDeal || false,
    type: (h.type as Hotel["type"]) || "Hotel",
    coords: resolveCoords(h),
    mapUrl: h.mapUrl || "",
    amenities: h.amenities || ["Free WiFi"],
    rooms: (h.rooms || []).length > 0
      ? (h.rooms || []).map((r: any) => ({
          id: r.id || r._id || "r1",
          roomTypeId: r.roomTypeId || "",
          name: r.name || "Standard Room",
          description: r.description || "",
          price: r.price || h.pricePerNight || 500,
          capacity: r.capacity || 2,
          bed: r.bed || "1 King Bed",
          available: r.available ?? 1,
          features: Array.isArray(r.features) ? r.features : (typeof r.features === 'string' ? r.features.split(' ') : ["WiFi"]),
          breakfastIncluded: r.breakfastIncluded || false,
          freeCancellation: r.freeCancellation || false,
        }))
      : [],
    reviews: (h.reviews || []).map((r: any) => ({
      id: r._id || r.id || Math.random().toString(36),
      author: r.author || "",
      rating: r.rating || 5,
      comment: r.comment || "",
      date: r.date || "",
    })),
  };
}

// ── City → approximate coordinates lookup ────────────────
// Used as a fallback when a hotel is saved without explicit coordinates.
// Covers the most common hotel cities worldwide.
const CITY_COORDS: Record<string, [number, number]> = {
  // Asia
  "tokyo": [35.6895, 139.6917], "japan": [36.2048, 138.2529],
  "singapore": [1.3521, 103.8198], "bangkok": [13.7563, 100.5018],
  "dubai": [25.2048, 55.2708], "abu dhabi": [24.4539, 54.3773],
  "hong kong": [22.3193, 114.1694], "shanghai": [31.2304, 121.4737],
  "beijing": [39.9042, 116.4074], "mumbai": [19.0760, 72.8777],
  "delhi": [28.6139, 77.2090], "bangalore": [12.9716, 77.5946],
  "chennai": [13.0827, 80.2707], "kolkata": [22.5726, 88.3639],
  "hyderabad": [17.3850, 78.4867], "bali": [-8.3405, 115.0920],
  "jakarta": [-6.2088, 106.8456], "kuala lumpur": [3.1390, 101.6869],
  "seoul": [37.5665, 126.9780], "osaka": [34.6937, 135.5023],
  "maldives": [4.1755, 73.5093], "colombo": [6.9271, 79.8612],
  "kathmandu": [27.7172, 85.3240], "dhaka": [23.8103, 90.4125],
  // Europe
  "paris": [48.8566, 2.3522], "london": [51.5074, -0.1278],
  "rome": [41.9028, 12.4964], "milan": [45.4654, 9.1859],
  "barcelona": [41.3851, 2.1734], "madrid": [40.4168, -3.7038],
  "amsterdam": [52.3676, 4.9041], "berlin": [52.5200, 13.4050],
  "vienna": [48.2082, 16.3738], "prague": [50.0755, 14.4378],
  "budapest": [47.4979, 19.0402], "istanbul": [41.0082, 28.9784],
  "athens": [37.9838, 23.7275], "lisbon": [38.7169, -9.1399],
  "zurich": [47.3769, 8.5417], "geneva": [46.2044, 6.1432],
  "zermatt": [46.0207, 7.7491], "santorini": [36.3932, 25.4615],
  "mykonos": [37.4467, 25.3289], "dubrovnik": [42.6507, 18.0944],
  "venice": [45.4408, 12.3155], "florence": [43.7696, 11.2558],
  "monaco": [43.7384, 7.4246], "Nice": [43.7102, 7.2620],
  // Americas
  "new york": [40.7128, -74.0060], "los angeles": [34.0522, -118.2437],
  "miami": [25.7617, -80.1918], "chicago": [41.8781, -87.6298],
  "san francisco": [37.7749, -122.4194], "las vegas": [36.1699, -115.1398],
  "toronto": [43.6532, -79.3832], "vancouver": [49.2827, -123.1207],
  "mexico city": [19.4326, -99.1332], "cancun": [21.1619, -86.8515],
  "rio de janeiro": [-22.9068, -43.1729], "são paulo": [-23.5505, -46.6333],
  "buenos aires": [-34.6037, -58.3816], "bogota": [4.7110, -74.0721],
  // Africa & Middle East
  "cairo": [30.0444, 31.2357], "marrakech": [31.6295, -7.9811],
  "cape town": [-33.9249, 18.4241], "johannesburg": [-26.2041, 28.0473],
  "nairobi": [-1.2921, 36.8219], "riyadh": [24.7136, 46.6753],
  "doha": [25.2854, 51.5310], "muscat": [23.5880, 58.3829],
  // Oceania
  "sydney": [-33.8688, 151.2093], "melbourne": [-37.8136, 144.9631],
  "auckland": [-36.8485, 174.7633],
};

function resolveCoords(h: any): [number, number] {
  const raw = h.coords;
  if (
    Array.isArray(raw) && raw.length === 2 &&
    typeof raw[0] === "number" && raw[0] !== 0 &&
    typeof raw[1] === "number" && raw[1] !== 0
  ) {
    return raw as [number, number];
  }

  // Try to match city or location string against lookup table
  const haystack = `${h.city || ""} ${h.location || ""} ${h.name || ""}`.toLowerCase();
  for (const [key, coords] of Object.entries(CITY_COORDS)) {
    if (haystack.includes(key)) return coords;
  }

  // Last resort: return [0, 0] — HotelMap will skip this marker
  return [0, 0];
}

function getCachedHotels(): Hotel[] {
  try {
    const raw = localStorage.getItem(HOTEL_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];

    // Clear stale demo/local hotel cache to avoid showing outdated dummy data
    const isDemoCache = parsed.some((hotel: any) =>
      Array.isArray(hotel.rooms) && hotel.rooms.some((room: any) => 
        /^r\d+$/.test(String(room.id)) || typeof room.features === 'string'
      )
    );
    if (isDemoCache) {
      localStorage.removeItem(HOTEL_CACHE_KEY);
      return [];
    }

    return parsed;
  } catch {
    return [];
  }
}

export type SearchData = {
  location: string;
  checkIn: string;
  checkOut: string;
  guests: number;
};

export type Adult = {
  name: string;
  email: string;
  phone: string;
  specialRequests?: string;
  id: string;
};
export type Child = { name: string; age: string; id: string };

export type GuestDetails = {
  name: string;
  email: string;
  phone: string;
  specialRequests?: string;
  adults?: Adult[];
  children?: Child[];
};

export type BookingStatus = "Confirmed" | "Cancelled" | "Completed";

export type Booking = {
  id: string;
  hotel: Hotel;
  room: Room;
  search: SearchData;
  guest: GuestDetails;
  nights: number;
  subtotal: number;
  taxes: number;
  discount: number;
  total: number;
  status: BookingStatus;
  createdAt: string;
};

export type UserProfile = {
  name: string;
  email: string;
  phone: string;
  city: string;
  wishlist?: string[];
  role?: string;
};

type Ctx = {
  hotels: Hotel[];
  search: SearchData;
  setSearch: (s: SearchData) => void;
  selectedHotel: Hotel | null;
  setSelectedHotel: (h: Hotel | null) => void;
  selectedRoom: Room | null;
  setSelectedRoom: (r: Room | null) => void;
  guest: GuestDetails | null;
  setGuest: (g: GuestDetails) => void;
  promo: { code: string; pct: number } | null;
  applyPromo: (code: string) => Promise<boolean>;
  bookings: Booking[];
  addBooking: (b: Booking) => void;
  cancelBooking: (id: string) => void;
  user: UserProfile | null;
  setUser: (u: UserProfile | null) => void;
  refreshUser: () => Promise<void>;
  submitReview: (hotelId: string, review: { author: string; rating: number; comment: string; captchaId?: string; captchaAnswer?: string; captchaToken?: string }) => Promise<void>;
};

const BookingCtx = createContext<Ctx | null>(null);

const todayPlus = (d: number) => {
  const t = new Date();
  t.setDate(t.getDate() + d);
  return t.toISOString().slice(0, 10);
};

export const BookingProvider = ({ children }: { children: ReactNode }) => {
  const [search, setSearch] = useState<SearchData>({
    location: "",
    checkIn: todayPlus(7),
    checkOut: todayPlus(10),
    guests: 2,
  });
  const [selectedHotel, _setSelectedHotel] = useState<Hotel | null>(null);
  const [selectedRoom, _setSelectedRoom] = useState<Room | null>(null);
  const [guest, setGuest] = useState<GuestDetails | null>(null);
  const [promo, setPromo] = useState<{ code: string; pct: number } | null>(null);
  const [hotels, setHotels] = useState<Hotel[]>(() => getCachedHotels());
  const [bookings, setBookings] = useState<Booking[]>(() => {
    try {
      const raw = localStorage.getItem("luxe_bookings");
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const [user, _setUser] = useState<UserProfile | null>(() => {
    try {
      const raw = localStorage.getItem("luxe_user");
      return raw && raw !== "null" ? JSON.parse(raw) : null;
    } catch { return null; }
  });

  useEffect(() => { localStorage.setItem("luxe_bookings", JSON.stringify(bookings)); }, [bookings]);
  useEffect(() => { localStorage.setItem("luxe_user", JSON.stringify(user)); }, [user]);

  // Handle centralized logout events (e.g. from 401 Unauthorized interceptor)
  useEffect(() => {
    const handleLuxeLogout = () => { setUser(null); };
    window.addEventListener("luxe_logout", handleLuxeLogout);
    return () => window.removeEventListener("luxe_logout", handleLuxeLogout);
  }, []);

  // Centralized user refresh logic
  const refreshUser = async () => {
    try {
      const res = await api.get("/auth/me");
      if (res.data?.success && res.data.data) {
        _setUser(res.data.data);
      }
    } catch {
      // Ignore errors if not logged in
    }
  };

  // Fetch latest user profile details on mount to sync database role updates
  useEffect(() => {
    const controller = new AbortController();
    const fetchUserProfile = async () => {
      try {
        // Cookie is sent automatically — no localStorage token check needed
        const res = await api.get("/auth/me", { signal: controller.signal });
        if (res.data?.success && res.data.data) {
          _setUser(res.data.data);
        }
      } catch (err: any) {
        if (err.name === "CanceledError" || err.message === "canceled") return;
        // Not logged in or cookie expired — silently ignore
      }
    };
    fetchUserProfile();
    return () => controller.abort();
  }, []);

  // ── Global real-time notification listener ───────────────
  useEffect(() => {
    if (!user?.email) return;
    socket.emit("registerNotifications", { role: "customer", userId: user.email });
    const onNotification = (data: { message?: string; type?: string }) => {
      const msg = data?.message || "You have a new notification";
      const type = data?.type || "system";
      if (type === "booking") toast.success(msg, { duration: 6000, icon: "📅" });
      else if (type === "price") toast(msg, { duration: 6000, icon: "💰" });
      else toast(msg, { duration: 6000, icon: "🔔" });
    };
    socket.on("notification", onNotification);
    return () => { socket.off("notification", onNotification); };
  }, [user?.email]);

  // Inactivity/Idle timer: log user out after 15 minutes of inactivity
  useEffect(() => {
    if (!user) return;

    let timeoutId: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setUser(null);
      }, 15 * 60 * 1000); // 15 minutes
    };

    const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];
    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [user]);

  // Real-time hotel updates via SSE with auto-reconnect, polling fallback
  useEffect(() => {
    let sse: EventSource | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectDelay = 2000;
    let destroyed = false;
    const controller = new AbortController();

    const applyHotels = (data: any[]) => {
      // MongoDB/API is the source of truth. Empty array means no active hotels.
      if (Array.isArray(data)) {
        const mapped = data.map((h) => mapHotel(h));
        setHotels(mapped);
        localStorage.setItem(HOTEL_CACHE_KEY, JSON.stringify(mapped));
      }
    };

    const fetchHotels = () => {
      if (destroyed) return;
      fetch(`${API}/hotels`, { signal: controller.signal })
        .then((r) => r.json())
        .then((d) => { if (Array.isArray(d?.data)) applyHotels(d.data); })
        .catch(() => {});
    };

    const startPolling = () => {
      if (pollTimer) return;
      fetchHotels();
      pollTimer = setInterval(fetchHotels, 15000); // poll every 15s as fallback
    };

    const stopPolling = () => {
      if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    };

    const connect = () => {
      if (destroyed) return;
      try {
        sse = new EventSource(`${API}/sse/hotels`);

        sse.onopen = () => {
          reconnectDelay = 2000;
          // Don't stop polling immediately — wait for first message to confirm data flows
        };

        sse.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data);
            if (msg.type === "hotels_updated") {
              applyHotels(msg.data);
              stopPolling(); // SSE is delivering data — stop polling
            }
          } catch {}
        };

        sse.onerror = () => {
          sse?.close();
          sse = null;
          startPolling();
          reconnectTimer = setTimeout(() => {
            reconnectDelay = Math.min(reconnectDelay * 2, 30000);
            connect();
          }, reconnectDelay);
        };
      } catch {
        startPolling();
      }
    };

    // Always do an immediate fetch on mount so hotels load even before SSE connects
    fetchHotels();
    if (import.meta.env.PROD) {
      startPolling();
      return () => {
        destroyed = true;
        stopPolling();
        if (reconnectTimer) clearTimeout(reconnectTimer);
      };
    }
    connect();

    return () => {
      destroyed = true;
      controller.abort();
      if (sse) {
        sse.close();
        sse = null;
      }
      stopPolling();
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };
  }, []);

  const setSelectedHotel = (h: Hotel | null) => {
    _setSelectedHotel(h);
    // Clear promo when starting a new booking
    if (h) setPromo(null);
  };

  const setSelectedRoom = (r: Room | null) => {
    _setSelectedRoom(r);
  };

  const applyPromo = async (code: string): Promise<boolean> => {
    try {
      // Pass user email so backend can check first-time status
      const userEmail = user?.email || "";
      const res = await fetch(`${API}/promo/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, subtotal: 0, userEmail }),
      });
      const json = await res.json();
      // The /promo/validate endpoint returns fields at the top level (not nested under data)
      if (json?.valid) {
        setPromo({ code: json.code, pct: json.discountPct });
        return true;
      }
      return false;
    } catch {}
    setPromo(null);
    return false;
  };

  const setUser = (u: UserProfile | null) => {
    _setUser(u);
    // Clear per-user data when logging out so the next user doesn't see stale bookings
    if (!u) {
      setBookings([]);
      localStorage.removeItem("luxe_bookings");
      // HttpOnly cookie cleared server-side by /api/auth/logout
      socket.disconnect().connect();
    } else {
      socket.disconnect().connect();
    }
  };

  const addBooking = (b: Booking) => setBookings((prev) => [b, ...prev]);
  const cancelBooking = (id: string) =>
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status: "Cancelled" as const } : b)));

  const submitReview = async (
    hotelId: string,
    review: { author: string; rating: number; comment: string; captchaId?: string; captchaAnswer?: string; captchaToken?: string }
  ) => {
    try {
      const response = await api.post(`/hotels/${hotelId}/reviews`, review);
      const json = response.data;
      if (!json.success) {
        throw new Error(json.message || "Failed to submit review.");
      }

      const updatedHotel = mapHotel(json.data);
      setHotels((prev) => {
        const next = prev.map((h) => (h.id === updatedHotel.id ? updatedHotel : h));
        localStorage.setItem(HOTEL_CACHE_KEY, JSON.stringify(next));
        return next;
      });
    } catch (err: any) {
      throw new Error(err.message || "Failed to submit review.");
    }
  };

  return (
    <BookingCtx.Provider value={{
      hotels, search, setSearch, selectedHotel, setSelectedHotel,
      selectedRoom, setSelectedRoom, guest, setGuest, promo, applyPromo,
      bookings, addBooking, cancelBooking, user, setUser, refreshUser, submitReview,
    }}>
      {children}
    </BookingCtx.Provider>
  );
};

export const useBooking = () => {
  const ctx = useContext(BookingCtx);
  if (!ctx) throw new Error("useBooking must be used within BookingProvider");
  return ctx;
};

export const calcNights = (a: string, b: string) => {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)));
};
