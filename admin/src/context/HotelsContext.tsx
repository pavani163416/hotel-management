import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
import socket from "@/services/socket";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export type Hotel = {
  id: string;
  hotelId: string;
  name: string;
  subtitle: string;
  location: string;
  country: string;
  rooms: number;
  activeBookings: number;
  ytdRevenue: number;
  status: "Active" | "Maintenance" | "Inactive";
  img: string;
  amenities: string[];
  floors: number;
};

type HotelsCtx = {
  hotels: Hotel[];
  loading: boolean;
  addHotel: (h: Omit<Hotel, "id">) => void;
  updateHotel: (hotelId: string, data: Partial<Hotel>) => void;
  deleteHotel: (hotelId: string) => void;
  reloadHotels: () => void;
};

const Ctx = createContext<HotelsCtx | null>(null);

function mapBackend(h: any): Hotel {
  return {
    id:             String(h._id || h.id || Date.now()),
    hotelId:        h.hotelId || String(h._id || h.id || Date.now()),
    name:           h.name,
    subtitle:       h.description || h.subtitle || "",
    location:       h.location || h.city || "",
    country:        h.country || (h.city || "").toUpperCase(),
    rooms:          h.totalRooms ?? (Array.isArray(h.rooms) ? h.rooms.length : h.rooms) ?? 0,
    activeBookings: h.activeBookings || 0,
    ytdRevenue:     h.ytdRevenue || 0,
    status:         h.isActive === false ? "Inactive" : (h.status || "Active"),
    img:            h.image || h.img || "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=60&q=80",
    amenities:      Array.isArray(h.amenities) ? h.amenities : [],
    floors:         h.floors || 1,
  };
}

export const HotelsProvider = ({ children }: { children: ReactNode }) => {
  // Start empty + loading — never show stale data
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  const fetchFromBackend = () => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    fetch(`${API}/hotels`, {
      signal: abortRef.current.signal,
    })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.data)) {
          setHotels(data.data.map(mapBackend));
        }
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchFromBackend();
    return () => { if (abortRef.current) abortRef.current.abort(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Real-time hotel updates via singleton Socket.IO
  useEffect(() => {
    const reload = () => fetchFromBackend();
    socket.on("hotelCreated", reload);
    socket.on("hotelUpdated", reload);
    socket.on("newBooking", reload);
    socket.on("booking_update", reload);
    return () => {
      socket.off("hotelCreated", reload);
      socket.off("hotelUpdated", reload);
      socket.off("newBooking", reload);
      socket.off("booking_update", reload);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reloadHotels = () => fetchFromBackend();
  const addHotel = (h: Omit<Hotel, "id">) => {
    setHotels((prev) => [...prev, { ...h, id: Date.now().toString() }]);
  };
  const updateHotel = (hotelId: string, data: Partial<Hotel>) => {
    setHotels((prev) => prev.map((h) => h.hotelId === hotelId ? { ...h, ...data } : h));
  };
  const deleteHotel = (hotelId: string) => {
    setHotels((prev) => prev.filter((h) => h.hotelId !== hotelId));
  };

  return (
    <Ctx.Provider value={{ hotels, loading, addHotel, updateHotel, deleteHotel, reloadHotels }}>
      {children}
    </Ctx.Provider>
  );
};

export const useHotels = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useHotels must be used within HotelsProvider");
  return ctx;
};
