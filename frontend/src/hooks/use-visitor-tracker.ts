/**
 * useVisitorTracker — sends real-time page visit data to the backend via WebSocket.
 * Tracks: page, referrer, device, browser, OS, geo (country/city), session.
 */
import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { API_URL } from "../services/api";

const WS_URL = API_URL.replace(/^http/, "ws").replace(/\/api$/, "");

function getDevice(): string {
  const ua = navigator.userAgent;
  if (/tablet|ipad/i.test(ua)) return "Tablet";
  if (/mobile/i.test(ua)) return "Mobile";
  return "Desktop";
}

function getBrowser(): string {
  const ua = navigator.userAgent;
  if (/edg/i.test(ua)) return "Edge";
  if (/chrome/i.test(ua)) return "Chrome";
  if (/firefox/i.test(ua)) return "Firefox";
  if (/safari/i.test(ua)) return "Safari";
  return "Other";
}

function getOS(): string {
  const ua = navigator.userAgent;
  if (/windows/i.test(ua)) return "Windows";
  if (/mac os/i.test(ua)) return "macOS";
  if (/android/i.test(ua)) return "Android";
  if (/iphone|ipad/i.test(ua)) return "iOS";
  if (/linux/i.test(ua)) return "Linux";
  return "Other";
}

function getSessionId(): string {
  let id = sessionStorage.getItem("luxe_session");
  if (!id) {
    id = `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem("luxe_session", id);
  }
  return id;
}

// Cached geo data so we only fetch once per session
let geoCache: { country: string; countryCode: string; city: string } | null = null;

async function getGeo() {
  if (geoCache) return geoCache;
  try {
    // ipapi.co — free HTTPS geo API, no key needed
    const r = await fetch("https://ipapi.co/json/", {
      signal: AbortSignal.timeout(3000),
    });
    if (r.ok) {
      const d = await r.json();
      if (d.country_name) {
        geoCache = { country: d.country_name, countryCode: d.country_code, city: d.city || "" };
        return geoCache;
      }
    }
  } catch {}

  try {
    // freeipapi.com — secondary fallback geolocation API
    const r = await fetch("https://freeipapi.com/api/json", {
      signal: AbortSignal.timeout(3000),
    });
    if (r.ok) {
      const d = await r.json();
      if (d.countryName) {
        geoCache = { country: d.countryName, countryCode: d.countryCode, city: d.cityName || "" };
        return geoCache;
      }
    }
  } catch {}

  // Fallback
  geoCache = { country: "Unknown", countryCode: "XX", city: "" };
  return geoCache;
}

export function useVisitorTracker() {
  const location = useLocation();
  const wsRef = useRef<WebSocket | null>(null);
  const visitIdRef = useRef<string | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const sessionId = getSessionId();
  const pendingPageRef = useRef<string | null>(null);

  // Connect WebSocket once, send pending page visit once open
  useEffect(() => {
    let ws: WebSocket;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      try {
        ws = new WebSocket(`${WS_URL}/ws?role=user`);
        wsRef.current = ws;

        ws.onopen = () => {
          // Send any page visit that was queued before connection opened
          if (pendingPageRef.current) {
            sendVisit(ws, pendingPageRef.current);
            pendingPageRef.current = null;
          }
        };

        ws.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data);
            if (msg.type === "visit_ack") visitIdRef.current = msg.id;
          } catch {}
        };

        ws.onerror = () => {};
        ws.onclose = () => {
          reconnectTimer = setTimeout(connect, 5000);
        };
      } catch {}
    };

    connect();

    return () => {
      clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, []);

  // Send a page_visit message with geo data
  const sendVisit = async (ws: WebSocket, page: string) => {
    const geo = await getGeo();
    const payload = JSON.stringify({
      type:        "page_visit",
      page,
      referrer:    document.referrer || "direct",
      device:      getDevice(),
      browser:     getBrowser(),
      os:          getOS(),
      sessionId,
      country:     geo.country,
      countryCode: geo.countryCode,
      city:        geo.city,
    });
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  };

  // Track page changes
  useEffect(() => {
    const ws = wsRef.current;

    // Send leave for previous page
    if (visitIdRef.current && ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type:     "page_leave",
        id:       visitIdRef.current,
        duration: Math.round((Date.now() - startTimeRef.current) / 1000),
        status:   "Active",
      }));
      visitIdRef.current = null;
    }

    startTimeRef.current = Date.now();

    if (!ws || ws.readyState !== WebSocket.OPEN) {
      // WS not ready yet — queue the visit, it'll be sent on ws.onopen
      pendingPageRef.current = location.pathname;
      return;
    }

    sendVisit(ws, location.pathname);
  }, [location.pathname]);

  // Send leave on tab close
  useEffect(() => {
    const handleUnload = () => {
      const ws = wsRef.current;
      const id = visitIdRef.current;
      if (!ws || !id || ws.readyState !== WebSocket.OPEN) return;
      const duration = Math.round((Date.now() - startTimeRef.current) / 1000);
      ws.send(JSON.stringify({
        type: "page_leave",
        id,
        duration,
        status: duration < 10 ? "Bounced" : "Active",
      }));
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, []);
}

export function markSessionConverted() {
  const sessionId = getSessionId();
  const wsUrl = API_URL.replace(/^http/, "ws").replace(/\/api$/, "");
  try {
    const ws = new WebSocket(`${wsUrl}/ws?role=user`);
    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "convert", sessionId }));
      setTimeout(() => ws.close(), 500);
    };
  } catch {}
}
