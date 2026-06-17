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
  withCredentials: true, // send HttpOnly cookie in handshake — no localStorage token needed
});

socket.on("connect", () => {
  console.log("[Socket.IO] Connected successfully", socket.id);
});

socket.on("connect_error", () => {
  // Keep the console clean when the backend is temporarily unavailable.
});

socket.on("disconnect", () => {
  // Socket reconnects automatically; no extra noise needed here.
});

export default socket;
