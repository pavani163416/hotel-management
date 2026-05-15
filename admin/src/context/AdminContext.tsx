import { createContext, useContext, useState, ReactNode } from "react";

export type Admin = {
  name: string;
  email: string;
  role: string;
  hotelId?: string;
  hotelName?: string;
  assignedHotelId?: string;
  assignedHotelName?: string;
};

type AdminCtx = {
  admin: Admin | null;
  token: string | null;
  login: (admin: Admin, token: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
  isManager: boolean;
  setHotel: (hotelId: string, hotelName: string) => void;
};

const Ctx = createContext<AdminCtx | null>(null);

// ── Check if a JWT is expired without a library ──────────
function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp ? payload.exp * 1000 < Date.now() : false;
  } catch {
    return true; // malformed token → treat as expired
  }
}

function loadStoredSession(): { admin: Admin | null; token: string | null } {
  try {
    const token = localStorage.getItem("luxe_admin_token");
    const admin = JSON.parse(localStorage.getItem("luxe_admin") || "null");
    if (!token || isTokenExpired(token)) {
      localStorage.removeItem("luxe_admin_token");
      localStorage.removeItem("luxe_admin");
      return { admin: null, token: null };
    }
    return { admin, token };
  } catch {
    return { admin: null, token: null };
  }
}

export const AdminProvider = ({ children }: { children: ReactNode }) => {
  const stored = loadStoredSession();
  const [admin, setAdmin] = useState<Admin | null>(stored.admin);
  const [token, setToken] = useState<string | null>(stored.token);

  const login = (a: Admin, t: string) => {
    setAdmin(a); setToken(t);
    localStorage.setItem("luxe_admin", JSON.stringify(a));
    localStorage.setItem("luxe_admin_token", t);
  };

  const logout = () => {
    setAdmin(null); setToken(null);
    localStorage.removeItem("luxe_admin");
    localStorage.removeItem("luxe_admin_token");
  };

  const setHotel = (hotelId: string, hotelName: string) => {
    const updated = { ...admin!, hotelId, hotelName };
    setAdmin(updated);
    localStorage.setItem("luxe_admin", JSON.stringify(updated));
  };

  const isManager = admin?.role === "Manager";

  return (
    <Ctx.Provider value={{ admin, token, login, logout, isAuthenticated: !!token, isManager, setHotel }}>
      {children}
    </Ctx.Provider>
  );
};

export const useAdmin = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
};
