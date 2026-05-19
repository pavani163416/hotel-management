import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from "react";
import socket from "@/services/socket";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export type Payment = {
  transactionId: string;
  method: "Credit Card" | "UPI" | "Bank Transfer" | "Cash";
  paidAt: string;
  refundedAt?: string;
  status: "Paid" | "Pending" | "Refunded" | "Failed";
};

export type Booking = {
  id: string;
  guestSnapshot: { name: string; email: string };
  room: { type: string; roomNumber: string };
  checkIn: string;
  checkOut: string;
  nights: number;
  totalAmount: number;
  status: "Confirmed" | "Pending" | "Cancelled" | "Completed";
  property: string;
  createdAt: string;
  payment?: Payment;
};

export type NewBookingAlert = {
  bookingId: string;
  hotelName: string;
  userName: string;
  amount: number;
  roomType: string;
  status: string;
  createdAt: string;
};

type BookingsCtx = {
  bookings: Booking[];
  loading: boolean;
  addBooking: (b: Omit<Booking, "id" | "createdAt">) => Booking;
  updateStatus: (id: string, status: Booking["status"]) => void;
  refetch: () => void;
  liveAlerts: NewBookingAlert[];
  pushLiveAlert: (alert: NewBookingAlert) => void;
  clearLiveAlerts: () => void;
};

const Ctx = createContext<BookingsCtx | null>(null);

// Avoid clearing bookings cache automatically; let the app refresh from the API.

function mapBackend(b: any): Booking {
  const nights = b.nights ??
    Math.max(1, Math.round(
      (new Date(b.checkOut).getTime() - new Date(b.checkIn).getTime()) / 86400000
    ));

  const methodMap: Record<string, Payment["method"]> = {
    card: "Credit Card", upi: "UPI",
    netbanking: "Bank Transfer", cash: "Cash",
  };
  const method: Payment["method"] = methodMap[b.paymentMethod] || "Credit Card";

  const transactionId = b.bookingRef
    ? `TXN-${b.bookingRef}`
    : `TXN-${String(b._id || b.id).slice(-8).toUpperCase()}`;
  const paidAt = b.createdAt || new Date().toISOString();

  const payment: Payment =
    b.status === "Cancelled"
      ? {
          transactionId,
          method,
          paidAt,
          refundedAt: b.cancelledAt || paidAt,
          status: "Refunded",
        }
      : {
          transactionId,
          method,
          paidAt,
          status:
            b.status === "Confirmed" || b.status === "Completed" || b.status === "CheckedIn" || b.status === "CheckedOut"
              ? "Paid"
              : "Pending",
        };

  return {
    id:            b.bookingRef || b._id || b.id,
    guestSnapshot: {
      name:  b.guestSnapshot?.name  || b.guest?.name  || "Guest",
      email: b.guestSnapshot?.email || b.guest?.email || "",
    },
    room: {
      type:       b.room?.type       || b.roomType || "Room",
      roomNumber: b.room?.roomNumber || b.roomNumber || "—",
    },
    checkIn:     b.checkIn,
    checkOut:    b.checkOut,
    nights,
    totalAmount: b.totalAmount || 0,
    status:      b.status || "Confirmed",
    property:    b.hotelName || b.property || "LuxeStay",
    createdAt:   b.createdAt || new Date().toISOString(),
    payment,
  };
}

function makePayment(status: Booking["status"], createdAt: string): Payment | undefined {
  if (status === "Cancelled") return undefined;
  return {
    transactionId: `TXN-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
    method: "Credit Card",
    paidAt: createdAt,
    status: status === "Pending" ? "Pending" : "Paid",
  };
}

export const BookingsProvider = ({ children }: { children: ReactNode }) => {
  // Start with loading=true and empty array — NEVER show stale/old data
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveAlerts, setLiveAlerts] = useState<NewBookingAlert[]>([]);

  // Debounce + rate-limit guard
  const fetchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFetchAt = useRef<number>(0);
  const MIN_FETCH_INTERVAL = 3000;
  // AbortController for cleanup
  const abortRef = useRef<AbortController | null>(null);
  const fetchSeq = useRef(0);

  const doFetch = useCallback(() => {
    // Cancel any in-flight request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const seq = fetchSeq.current + 1;
    fetchSeq.current = seq;

    lastFetchAt.current = Date.now();
    setLoading(true);

    const token = localStorage.getItem("luxe_admin_token");
    fetch(`${API}/bookings?limit=500`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: controller.signal,
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        const raw: any[] = Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data)
          ? data
          : [];
        // Always replace state with fresh data — even empty array clears stale
        if (seq !== fetchSeq.current) return;
        setBookings(
          raw
            .filter((b) => b?._id || b?.id || b?.bookingRef)
            .map(mapBackend)
        );
      })
      .catch((err) => {
        if (err.name === "AbortError") return; // intentional cancel — ignore
        // Network error — keep current state, stop loading
      })
      .finally(() => {
        if (seq === fetchSeq.current && !controller.signal.aborted) {
          setLoading(false);
        }
      });
  }, []);

  const fetchBookings = useCallback((immediate = false) => {
    if (fetchTimer.current) clearTimeout(fetchTimer.current);
    const timeSinceLast = Date.now() - lastFetchAt.current;
    if (immediate || timeSinceLast >= MIN_FETCH_INTERVAL) {
      doFetch();
    } else {
      fetchTimer.current = setTimeout(doFetch, MIN_FETCH_INTERVAL - timeSinceLast);
    }
  }, [doFetch]);

  // Fetch once on mount — abort on unmount
  useEffect(() => {
    doFetch();
    return () => {
      if (abortRef.current) abortRef.current.abort();
      if (fetchTimer.current) clearTimeout(fetchTimer.current);
    };
  }, [doFetch]);

  const pushLiveAlert = useCallback((alert: NewBookingAlert) => {
    setLiveAlerts((prev) => [alert, ...prev].slice(0, 20));
  }, []);

  // Socket.IO real-time listener
  useEffect(() => {
    const handleNewBooking = (data: NewBookingAlert) => {
      pushLiveAlert(data);
      fetchBookings();
    };
    const handleBookingUpdate = () => fetchBookings();

    socket.on("newBooking", handleNewBooking);
    socket.on("booking_update", handleBookingUpdate);

    return () => {
      socket.off("newBooking", handleNewBooking);
      socket.off("booking_update", handleBookingUpdate);
    };
  }, [fetchBookings, pushLiveAlert]);

  const clearLiveAlerts = useCallback(() => setLiveAlerts([]), []);

  const addBooking = (data: Omit<Booking, "id" | "createdAt">): Booking => {
    const createdAt = new Date().toISOString();
    const newBooking: Booking = {
      ...data,
      id: `BS-${Date.now().toString().slice(-4)}`,
      createdAt,
      payment: makePayment(data.status, createdAt),
    };
    doFetch();
    return newBooking;
  };

  const updateStatus = (id: string, status: Booking["status"]) => {
    setBookings((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b;
        const payment: Payment =
          status === "Cancelled"
            ? {
                ...(b.payment ?? {
                  transactionId: `TXN-${b.id}`,
                  method: "Credit Card" as const,
                  paidAt: b.createdAt,
                }),
                status: "Refunded",
                refundedAt: new Date().toISOString(),
              }
            : status === "Completed"
            ? { ...(b.payment ?? makePayment("Confirmed", b.createdAt)!), status: "Paid" }
            : b.payment ?? makePayment(status, b.createdAt)!;
        return { ...b, status, payment };
      })
    );
  };

  return (
    <Ctx.Provider value={{
      bookings, loading, addBooking, updateStatus, refetch: () => doFetch(),
      liveAlerts, pushLiveAlert, clearLiveAlerts,
    }}>
      {children}
    </Ctx.Provider>
  );
};

export const useBookings = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useBookings must be used within BookingsProvider");
  return ctx;
};
