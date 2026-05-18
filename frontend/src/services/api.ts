/**
 * LuxeStay API Service
 * Centralised Axios instance for all backend calls.
 * Base URL reads from VITE_API_URL env var (falls back to localhost:5000)
 */

import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  headers: { "Content-Type": "application/json" },
  timeout: 15000,
});

// ── Response interceptor: unwrap data / normalise errors ──
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.message ||
      "Something went wrong";
    return Promise.reject(new Error(message));
  }
);

export default api;

// ── Typed helpers ─────────────────────────────────────────

export interface CreateBookingPayload {
  roomId?: string;
  roomNumber?: string;
  roomTypeId?: string;
  guest: {
    name: string;
    email: string;
    phone: string;
    city?: string;
  };
  checkIn: string;
  checkOut: string;
  pricePerNight: number;
  subtotal: number;
  taxes: number;
  discount: number;
  totalAmount: number;
  promoCode?: string;
  paymentMethod: "card" | "upi" | "netbanking";
  specialRequests?: string;
  additionalAdults?: { name: string; email: string; phone: string; specialRequests?: string }[];
  additionalChildren?: { name: string; age: string }[];
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
}) => {
  const { data } = await api.get("/rooms", { params });
  return data;
};

/** PATCH /api/rooms/:id — update room status */
export const updateRoomStatus = async (
  roomId: string,
  status: "Available" | "Booked" | "Maintenance"
) => {
  const { data } = await api.patch(`/rooms/${roomId}`, { status });
  return data;
};

/** GET /api/auth/bookings — fetch bookings for the logged-in user via JWT */
export const getMyBookings = async (params?: { page?: number; limit?: number }) => {
  const token = localStorage.getItem("luxe_customer_token");
  const { data } = await api.get("/auth/bookings", {
    params,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
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
