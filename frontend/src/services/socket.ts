import { io } from "socket.io-client";

const BACKEND_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace("/api", "")
  : "http://localhost:5000";

const transports = import.meta.env.PROD ? ["polling"] : ["websocket", "polling"];

const socket = io(BACKEND_URL, {
  path: "/socket.io/",
  transports,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  randomizationFactor: 0.1,
  timeout: 20000,
  autoConnect: true,
  forceNew: false,
  multiplex: true,
});

socket.on("connect", () => {
  console.log("[Socket.IO] Connected successfully", socket.id);
});

socket.on("connect_error", (error) => {
  console.error("[Socket.IO] Connection error:", error);
});

socket.on("disconnect", (reason) => {
  console.warn("[Socket.IO] Disconnected:", reason);
});

export default socket;
