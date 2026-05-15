import { createContext, useContext, useState, ReactNode } from "react";

export type Guest = {
  id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  preferredHotel: string;
  totalVisits: number;
  lifetimeValue: number;
  status: "Active" | "Inactive" | "VIP";
  bookings?: any[];
};

type GuestsCtx = {
  guests: Guest[];
  addGuest: (g: Omit<Guest, "id">) => void;
  updateGuest: (id: string, data: Partial<Guest>) => void;
};

const Ctx = createContext<GuestsCtx | null>(null);

// Clear any stale dummy data that may have been saved to localStorage previously
try { localStorage.removeItem("luxe_guests"); } catch {}

export const GuestsProvider = ({ children }: { children: ReactNode }) => {
  // Start empty — Guests.tsx fetches real data from the API on mount.
  // No localStorage defaults to avoid showing stale/dummy data.
  const [guests, setGuests] = useState<Guest[]>([]);

  const addGuest = (g: Omit<Guest, "id">) => {
    setGuests((prev) => [...prev, { ...g, id: `g-${Date.now()}` }]);
  };
  const updateGuest = (id: string, data: Partial<Guest>) => {
    setGuests((prev) => prev.map((g) => g.id === id ? { ...g, ...data } : g));
  };

  return <Ctx.Provider value={{ guests, addGuest, updateGuest }}>{children}</Ctx.Provider>;
};

export const useGuests = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useGuests must be used within GuestsProvider");
  return ctx;
};
