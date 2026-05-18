/**
 * Singleton Socket.IO client for the admin panel.
 * Import `socket` wherever you need to listen for real-time events.
 */
import { io } from "socket.io-client";

const BACKEND_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace("/api", "")
  : "http://localhost:5000";

const transports = import.meta.env.PROD ? ["polling"] : ["websocket", "polling"];

const socket = io(BACKEND_URL, {
  path: "/socket.io/",
  transports,
  reconnection: true,
  reconnectionAttempts: 15,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 30000,
  randomizationFactor: 0.1,
  timeout: 20000,
  autoConnect: true,
  forceNew: false,
  multiplex: true,
  auth: (cb) => {
    const token = localStorage.getItem("luxe_admin_token");
    cb({ token });
  },
});

socket.on("connect", () => {
  console.log("[Socket.IO] connected:", socket.id);
});

socket.on("disconnect", (reason) => {
  console.warn("[Socket.IO] disconnected:", reason);
});

socket.on("connect_error", (err) => {
  console.error("[Socket.IO] connect error:", err.message, err);
});

export default socket;
