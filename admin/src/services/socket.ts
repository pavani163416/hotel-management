/**
 * Singleton Socket.IO client for the admin panel.
 * Import `socket` wherever you need to listen for real-time events.
 */
import { io } from "socket.io-client";

const BACKEND_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace("/api", "")
  : "http://localhost:5000";

const socket = io(BACKEND_URL, {
  autoConnect: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 3000,
  reconnectionDelayMax: 30000, // cap at 30s so it backs off gracefully
  transports: ["websocket", "polling"],
  auth: (cb) => {
    const token = localStorage.getItem("luxe_admin_token");
    cb({ token });
  },
});

socket.on("connect", () => {
  console.log("[Socket.IO] connected:", socket.id);
});

socket.on("disconnect", (reason) => {
  console.log("[Socket.IO] disconnected:", reason);
});

socket.on("connect_error", (err) => {
  // Only log once per error type to avoid console spam
  console.warn("[Socket.IO] connect error:", err.message);
});

export default socket;
