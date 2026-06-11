/**
 * LuxeStay API Service
 * Centralised Axios instance for all backend calls.
 * Base URL reads from VITE_API_URL env var (falls back to localhost:5000)
 */

import axios from "axios";

export const getApiUrl = () => {
  let url = import.meta.env.VITE_API_URL;
  if (!url) {
    const isLocal = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
    if (isLocal) {
      return "http://localhost:5000/api";
    }
    return "https://hotel-management-production-2225.up.railway.app/api";
  }
  url = url.trim().replace(/\/+$/, "");
  if (!url.toLowerCase().endsWith("/api")) {
    url = url + "/api";
  }
  return url;
};

export const API_URL = getApiUrl();
export const API = API_URL;

const api = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
  withCredentials: true, // send HttpOnly cookies automatically on every request
});

// ── Request interceptor ───────────────────────────────────
// HttpOnly cookies are sent automatically by the browser — no manual token
// attachment needed for web clients.
// Mobile / Flutter clients that still pass an Authorization: Bearer header
// will work unchanged because verifyCustomerToken accepts both.
api.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

// ── Response interceptor: unwrap data / normalise errors ──
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Intercept 401 Unauthorized errors to automatically clean up expired/invalid sessions
    if (error.response?.status === 401) {
      // No localStorage token to remove — cookie is cleared server-side via /logout
      localStorage.removeItem("luxe_user");
      localStorage.removeItem("luxe_bookings");
      window.dispatchEvent(new Event("luxe_logout"));
    }

    const message =
      error.response?.data?.message ||
      error.message ||
      "Something went wrong";
    const customError = new Error(message) as any;
    customError.status = error.response?.status;
    customError.code = error.response?.data?.code;
    customError.email = error.response?.data?.email;
    customError.response = error.response;
    return Promise.reject(customError);
  }
);

export default api;

// ── Typed helpers ─────────────────────────────────────────

export interface CreateBookingPayload {
  roomId?: string;
  roomNumber?: string;
  hotelId?: string;
  roomTypeId?: string;
  guest: {
    name: string;
    email: string;
    phone: string;
    city?: string;
    id?: string;
  };
  checkIn: string;
  checkOut: string;
  pricePerNight: number;
  subtotal: number;
  taxes: number;
  discount: number;
  totalAmount: number;
  guestCount?: number;
  promoCode?: string;
  paymentMethod: "card" | "upi" | "netbanking";
  specialRequests?: string;
  additionalAdults?: { name: string; email: string; phone: string; specialRequests?: string; id: string }[];
  additionalChildren?: { name: string; age: number; id: string }[];
}

export interface BookingResponse {
  success: boolean;
  message: string;
  data: {
    _id: string;
    bookingRef: string;
    status: string;
    nights: number;
    totalAmount: number;
    room?: { _id: string; roomNumber?: string; type?: string };
    roomType?: { _id: string; name: string };
    guest: { name: string; email: string };
    checkIn: string;
    checkOut: string;
    promoCode?: string;
    discount: number;
    paymentMethod: string;
    hotelName?: string;
  };
}

/** POST /api/bookings — creates guest + booking + marks room Booked atomically */
export const createBooking = async (
  payload: CreateBookingPayload
): Promise<BookingResponse> => {
  const { data } = await api.post<BookingResponse>("/bookings", payload);
  return data;
};

/** GET /api/rooms — fetch available rooms */
export const getRooms = async (params?: {
  status?: string;
  type?: string;
  minPrice?: number;
  maxPrice?: number;
  roomNumber?: string;
}) => {
  const { data } = await api.get("/rooms", { params });
  return data;
};

export const getRoomByNumber = async (roomNumber: string) => {
  const { data } = await api.get("/rooms", { params: { roomNumber } });
  return Array.isArray(data?.data) && data.data.length > 0 ? data.data[0] : null;
};

/** PATCH /api/rooms/:id — update room status */
export const updateRoomStatus = async (
  roomId: string,
  status: "Available" | "Booked" | "Maintenance"
) => {
  const { data } = await api.patch(`/rooms/${roomId}`, { status });
  return data;
};

/** GET /api/auth/bookings — fetch bookings for the logged-in user via HttpOnly cookie */
export const getMyBookings = async (params?: { page?: number; limit?: number }) => {
  const { data } = await api.get("/auth/bookings", { params });
  return data;
};

/** GET /api/bookings?guestEmail=... — fetch bookings for a guest */
export const getBookingsByEmail = async (email: string) => {
  const { data } = await api.get("/bookings", { params: { guestEmail: email } });
  return data;
};

export const getNotifications = async (params: Record<string, any>) => {
  const { data } = await api.get("/notifications", { params });
  return data;
};

export const markNotificationRead = async (id: string) => {
  const { data } = await api.put(`/notifications/${id}/read`);
  return data;
};

export const changePassword = async (oldPassword: string, newPassword: string) => {
  const { data } = await api.post(
    "/auth/change-password",
    { oldPassword, newPassword }
  );
  return data;
};

export const createNotification = async (payload: {
  role: string;
  hotelId?: string;
  userId?: string;
  message: string;
  type?: string;
}) => {
  const { data } = await api.post("/notifications", payload);
  return data;
};

/** PATCH /api/bookings/:id/cancel */
export const cancelBooking = async (bookingId: string, reason?: string) => {
  const { data } = await api.patch(`/bookings/${bookingId}/cancel`, { reason });
  return data;
};

/** POST /api/payments/create-order */
export const createPaymentOrder = async (bookingId: string) => {
  const { data } = await api.post("/payments/create-order", { bookingId });
  return data;
};

/** POST /api/payments/verify */
export const verifyPaymentSignature = async (payload: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}) => {
  const { data } = await api.post("/payments/verify", payload);
  return data;
};

/** GET /api/payments/status/:orderId */
export const getPaymentStatus = async (orderId: string) => {
  const { data } = await api.get(`/payments/status/${orderId}`);
  return data;
};

/** POST /api/payments/cancel — called when user dismisses Razorpay modal */
export const cancelPaymentOrder = async (payload: { orderId?: string; bookingId?: string }) => {
  const { data } = await api.post("/payments/cancel", payload);
  return data;
};
