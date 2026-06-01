import { createContext, useContext, useState, ReactNode } from "react";
import socket from "@/services/socket";

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
    const base64Url = token.split(".")[1];
    let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) {
      base64 += "=";
    }
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const payload = JSON.parse(jsonPayload);
    return payload.exp ? payload.exp * 1000 < Date.now() : false;
  } catch (err) {
    console.error("Token parse error:", err);
    return true; // malformed token → treat as expired
  }
}

function loadStoredSession(): { admin: Admin | null; token: string | null } {
  try {
    const token = localStorage.getItem("luxe_admin_token");
    const admin = JSON.parse(localStorage.getItem("luxe_admin") || "null");
    // If token is missing or expired, keep the stored admin object so cached UI data remains available.
    if (!token || isTokenExpired(token)) {
      // Clear only the token (session is not authenticated) but preserve `luxe_admin` in localStorage.
      localStorage.removeItem("luxe_admin_token");
      return { admin, token: null };
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
    socket.auth = { token: t };
    socket.disconnect().connect();
  };

  const logout = () => {
    setAdmin(null); setToken(null);
    localStorage.removeItem("luxe_admin");
    localStorage.removeItem("luxe_admin_token");
    socket.auth = { token: null };
    socket.disconnect().connect();
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
