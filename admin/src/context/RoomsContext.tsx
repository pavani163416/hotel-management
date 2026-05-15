import { createContext, useContext, useState, ReactNode } from "react";

export type Room = {
  id: string;
  roomNumber: string;
  type: string;
  pricePerNight: number;
  capacity: number;
  floor: string;
  status: "Available" | "Booked" | "Maintenance";
};

type RoomsCtx = {
  rooms: Room[];
  addRoom: (r: Omit<Room, "id">) => void;
  updateRoom: (id: string, data: Partial<Room>) => void;
  deleteRoom: (id: string) => void;
};

const Ctx = createContext<RoomsCtx | null>(null);

// Clear any stale dummy data that may have been saved to localStorage previously
try { localStorage.removeItem("luxe_rooms"); } catch {}

export const RoomsProvider = ({ children }: { children: ReactNode }) => {
  // Start empty — Rooms.tsx fetches real data from the API directly.
  const [rooms, setRooms] = useState<Room[]>([]);

  const addRoom = (r: Omit<Room, "id">) => {
    setRooms((prev) => [...prev, { ...r, id: `r-${Date.now()}` }]);
  };
  const updateRoom = (id: string, data: Partial<Room>) => {
    setRooms((prev) => prev.map((r) => r.id === id ? { ...r, ...data } : r));
  };
  const deleteRoom = (id: string) => {
    setRooms((prev) => prev.filter((r) => r.id !== id));
  };

  return <Ctx.Provider value={{ rooms, addRoom, updateRoom, deleteRoom }}>{children}</Ctx.Provider>;
};

export const useRooms = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useRooms must be used within RoomsProvider");
  return ctx;
};
