/**
 * Singleton Socket.IO client for the admin panel.
 * Import `socket` wherever you need to listen for real-time events.
 */
import { io } from "socket.io-client";
import { API_URL } from "./api";

const BACKEND_URL = API_URL.replace(/\/api$/, "");

const transports = ["websocket"]; // Force websocket transport

const socket = io(BACKEND_URL, {
  path: "/socket.io/",
  transports,
  reconnection: true,
  reconnectionAttempts: 50,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 10000,
  randomizationFactor: 0.5,
  timeout: 45000,
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
