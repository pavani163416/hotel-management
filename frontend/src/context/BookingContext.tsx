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
    id: h.hotelId || h.id || "",
    name: h.name || "",
    location: h.location || "",
    city: h.city || "",
    state: h.state || "",
    country: h.country || "",
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
    coords: (h.coords || [0, 0]) as [number, number],
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
          features: r.features || ["WiFi"],
        }))
      : [],
    reviews: (h.reviews || []).map((r: any) => ({
      id: r._id || r.id || Math.random().toString(36),
      author: r.author || "",
      rating: r.rating || 5,
      comment: r.comment || "",
      date: r.date || "",
      userId: r.userId,
      userEmail: r.userEmail || "",
    })),
  };
}

function getCachedHotels(): Hotel[] {
  try {
    const raw = localStorage.getItem(HOTEL_CACHE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];

    // Clear stale demo/local hotel cache to avoid showing outdated dummy data
    const isDemoCache = parsed.some((hotel: any) =>
      Array.isArray(hotel.rooms) && hotel.rooms.some((room: any) => /^r\d+$/.test(String(room.id)))
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
  submitReview: (hotelId: string, review: { rating: number; comment: string }) => Promise<void>;
  editReview: (hotelId: string, reviewId: string, review: { rating: number; comment: string }) => Promise<void>;
  deleteReview: (hotelId: string, reviewId: string) => Promise<void>;
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
    const handleLuxeLogout = () => {
      setUser(null);
    };
    window.addEventListener("luxe_logout", handleLuxeLogout);
    return () => window.removeEventListener("luxe_logout", handleLuxeLogout);
  }, []);

  // ── Global real-time notification listener ───────────────
  // Runs on every page so users always get popup alerts,
  // not just when they happen to be on /notifications.
  useEffect(() => {
    if (!user?.email) return;

    // Join the user's personal notification room
    socket.emit("registerNotifications", {
      role: "customer",
      userId: user.email,
    });

    const onNotification = (data: { message?: string; type?: string }) => {
      const msg = data?.message || "You have a new notification";
      const type = data?.type || "system";

      // Show a toast regardless of which page the user is on
      if (type === "booking") {
        toast.success(msg, { duration: 6000, icon: "📅" });
      } else if (type === "price") {
        toast(msg, { duration: 6000, icon: "💰" });
      } else if (type === "assistance") {
        toast.warning(msg, { duration: 6000, icon: "🔔" });
      } else {
        toast(msg, { duration: 6000, icon: "🔔" });
      }
    };

    socket.on("notification", onNotification);
    return () => {
      socket.off("notification", onNotification);
    };
  }, [user?.email]);

  // Real-time hotel updates via SSE with auto-reconnect, polling fallback
  useEffect(() => {
    let sse: EventSource | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectDelay = 2000;
    let destroyed = false;

    const applyHotels = (data: any[]) => {
      // MongoDB/API is the source of truth. Empty array means no active hotels.
      if (Array.isArray(data)) {
        const mapped = data.map((h) => mapHotel(h));
        setHotels(mapped);
        localStorage.setItem(HOTEL_CACHE_KEY, JSON.stringify(mapped));
      }
    };

    const fetchHotels = () => {
      fetch(`${API}/hotels`)
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
      sse?.close();
      stopPolling();
      if (reconnectTimer) clearTimeout(reconnectTimer);
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
      localStorage.removeItem("luxe_customer_token");
      socket.auth = { token: null };
      socket.disconnect().connect();
    } else {
      socket.auth = { token: localStorage.getItem("luxe_customer_token") };
      socket.disconnect().connect();
    }
  };

  const addBooking = (b: Booking) => setBookings((prev) => [b, ...prev]);
  const cancelBooking = (id: string) =>
    setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status: "Cancelled" as const } : b)));

  const submitReview = async (
    hotelId: string,
    review: { rating: number; comment: string }
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

  const editReview = async (
    hotelId: string,
    reviewId: string,
    review: { rating: number; comment: string }
  ) => {
    try {
      const response = await api.put(`/hotels/${hotelId}/reviews/${reviewId}`, review);
      const json = response.data;
      if (!json.success) {
        throw new Error(json.message || "Failed to update review.");
      }

      const updatedHotel = mapHotel(json.data);
      setHotels((prev) => {
        const next = prev.map((h) => (h.id === updatedHotel.id ? updatedHotel : h));
        localStorage.setItem(HOTEL_CACHE_KEY, JSON.stringify(next));
        return next;
      });
    } catch (err: any) {
      throw new Error(err.message || "Failed to update review.");
    }
  };

  const deleteReview = async (hotelId: string, reviewId: string) => {
    try {
      const response = await api.delete(`/hotels/${hotelId}/reviews/${reviewId}`);
      const json = response.data;
      if (!json.success) {
        throw new Error(json.message || "Failed to delete review.");
      }

      const updatedHotel = mapHotel(json.data);
      setHotels((prev) => {
        const next = prev.map((h) => (h.id === updatedHotel.id ? updatedHotel : h));
        localStorage.setItem(HOTEL_CACHE_KEY, JSON.stringify(next));
        return next;
      });
    } catch (err: any) {
      throw new Error(err.message || "Failed to delete review.");
    }
  };

  return (
    <BookingCtx.Provider value={{
      hotels, search, setSearch, selectedHotel, setSelectedHotel,
      selectedRoom, setSelectedRoom, guest, setGuest, promo, applyPromo,
      bookings, addBooking, cancelBooking, user, setUser, submitReview, editReview, deleteReview,
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
