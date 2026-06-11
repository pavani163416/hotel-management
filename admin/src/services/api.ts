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

const api = axios.create({ baseURL: API_URL, timeout: 15000, withCredentials: true });

// ── Attach JWT to every request ───────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("luxe_admin_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Unwrap response, handle 401 → redirect to login ──────
api.interceptors.response.use(
  (r) => r.data,
  (e) => {
    if (e.response?.status === 401 && !e.config?.url?.includes("/change-password")) {
      // Token expired or invalid — clear session and redirect
      // Remove only the token to avoid wiping cached admin data from localStorage.
      localStorage.removeItem("luxe_admin_token");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    let errMsg = e.response?.data?.message || e.message;
    if (e.response?.data?.errors && Array.isArray(e.response.data.errors)) {
      errMsg += ": " + e.response.data.errors.map((err: any) => err.message || err.msg).join(", ");
    }
    return Promise.reject(new Error(errMsg));
  }
);

// ════════════════════════════════════════════════════════
// AUTH
// POST /api/admin/login  { email, password }
// ════════════════════════════════════════════════════════
export const adminLogin = (email: string, password: string) =>
  api.post("/admin/login", { email, password });

export const requestPasswordReset = (email: string) =>
  api.post("/auth/forgot-password", { email });

export const resetPassword = (payload: { email: string; token: string; password: string }) =>
  api.post("/auth/reset-password", payload);

export const adminChangePassword = (currentPassword: string, newPassword: string) =>
  api.put("/admin/change-password", { currentPassword, newPassword });

// ════════════════════════════════════════════════════════
// DASHBOARD STATS
// GET /api/admin/stats
// Returns: totalHotels, totalBookings, totalRevenue, totalGuests,
//          availableRooms, bookedRooms, revenueThisMonth, etc.
// ════════════════════════════════════════════════════════
export const getStats = () => api.get("/admin/stats");

// ════════════════════════════════════════════════════════
// ANALYTICS
// GET /api/admin/analytics
// Returns: monthlyRevenue[], statusBreakdown[], topRooms[], occupancyRate
// ════════════════════════════════════════════════════════
export const getAnalytics = () => api.get("/admin/analytics");

// ════════════════════════════════════════════════════════
// ROOMS
// GET    /api/rooms                  → list all rooms (filters: status, type, minPrice, maxPrice)
// POST   /api/rooms                  → create room  { roomNumber, type, pricePerNight, capacity, status }
// GET    /api/rooms/:id              → single room
// PATCH  /api/rooms/:id              → update status { status: "Available"|"Booked"|"Maintenance" }
// DELETE /api/rooms/:id              → soft-delete (sets isActive: false)
// ════════════════════════════════════════════════════════
export const getRooms        = (params?: Record<string, any>) => api.get("/rooms", { params });
export const getRoomById     = (id: string)                   => api.get(`/rooms/${id}`);
export const createRoom      = (data: Record<string, any>)   => api.post("/rooms", data);
export const updateRoom      = (id: string, data: Record<string, any>) => api.patch(`/rooms/${id}`, data);
export const deleteRoom      = (id: string)                   => api.delete(`/rooms/${id}`);

// ════════════════════════════════════════════════════════
// BOOKINGS
// GET   /api/bookings                → all bookings (filters: status, guestEmail)
// POST  /api/bookings                → create booking (full guest + room transaction)
// GET   /api/bookings/:id            → single booking
// PATCH /api/bookings/:id/cancel     → cancel + free room  { reason? }
// ════════════════════════════════════════════════════════
export const getBookings     = (params?: Record<string, any>) => api.get("/bookings", { params });
export const getBookingById  = (id: string)                   => api.get(`/bookings/${id}`);
export const createBooking   = (data: Record<string, any>)   => api.post("/bookings", data);
export const cancelBooking   = (id: string, reason?: string) =>
  api.patch(`/bookings/${id}/cancel`, { reason });

// ════════════════════════════════════════════════════════
// GUESTS
// GET /api/guests          → all guests (with bookings populated)
// GET /api/guests/:id      → single guest with full booking history
// ════════════════════════════════════════════════════════
export const getGuests       = ()           => api.get("/guests");
export const getGuestById    = (id: string) => api.get(`/guests/${id}`);
export const getAdditionalGuests = (email: string) => api.get(`/guests/additional?email=${encodeURIComponent(email)}`);

// ════════════════════════════════════════════════════════
// HOTELS  (used by Manager panel)
// GET   /api/hotels
// GET   /api/hotels/:id
// PATCH /api/hotels/:id
// ════════════════════════════════════════════════════════
export const getHotels           = ()                                      => api.get("/hotels");
export const getHotelById        = (id: string)                            => api.get(`/hotels/${id}`);
export const updateHotel         = (id: string, data: Record<string, any>) => api.patch(`/hotels/${id}`, data);
export const addRoomToHotel      = (id: string, data: Record<string, any>) => api.post(`/hotels/${id}/rooms`, data);
export const removeRoomFromHotel = (hotelId: string, roomId: string)       => api.delete(`/hotels/${hotelId}/rooms/${roomId}`);

export const getNotifications = (params?: Record<string, any>) =>
  api.get("/notifications", { params });
export const markNotificationRead = (id: string) =>
  api.put(`/notifications/${id}/read`);
export const createNotification = (data: {
  role?: string;
  hotelId?: string;
  userId?: string;
  message: string;
  type?: string;
}) => api.post("/notifications", data);

export const getAdminPriceRequests = (params?: Record<string, any>) =>
  api.get("/admin/price-requests", { params });
export const approvePriceRequest = (id: string, note?: string) =>
  api.put(`/admin/price-requests/${id}/approve`, { note });
export const rejectPriceRequest = (id: string, note?: string) =>
  api.put(`/admin/price-requests/${id}/reject`, { note });

// ════════════════════════════════════════════════════════
// COUPONS & OFFERS
// ════════════════════════════════════════════════════════
export const getCoupons    = (params?: Record<string, any>) => api.get("/admin/coupons", { params });
export const createCoupon  = (data: Record<string, any>)   => api.post("/admin/coupons", data);
export const updateCoupon  = (id: string, data: Record<string, any>) => api.put(`/admin/coupons/${id}`, data);
export const deleteCoupon  = (id: string)                   => api.delete(`/admin/coupons/${id}`);

// ════════════════════════════════════════════════════════
// ADMIN → MANAGER ALERTS
// POST /api/admin/notify-manager  { hotelId, message, priority? }
// ════════════════════════════════════════════════════════
export const sendManagerAlert = (hotelId: string, message: string, priority = "medium") =>
  api.post("/admin/notify-manager", { hotelId, message, priority });
export const createManagerPriceRequest = (data: Record<string, any>) =>
  api.post("/manager/price-requests", data);
export const getManagerPriceRequests = (params?: Record<string, any>) =>
  api.get("/manager/price-requests", { params });

export default api;

// ════════════════════════════════════════════════════════
// MANAGER AUTH  (multi-tenant — hotel-scoped)
// POST /api/manager/login  { email, password }
// Returns: { name, email, role, assignedHotelId, assignedHotelName, token }
// ════════════════════════════════════════════════════════
export const managerLogin = (email: string, password: string) =>
  api.post("/manager/login", { email, password });

// ════════════════════════════════════════════════════════
// MANAGER — SCOPED API CALLS
// These use the same axios instance (JWT auto-attached).
// The backend scopes results to the manager's assignedHotelId.
// ════════════════════════════════════════════════════════

/** GET /api/manager/bookings — bookings for the manager's hotel only */
export const getManagerBookings = (params?: Record<string, any>) =>
  api.get("/manager/bookings", { params });
export const checkInManagerBooking = (id: string) =>
  api.put(`/manager/bookings/${id}/checkin`);
export const checkOutManagerBooking = (id: string) =>
  api.put(`/manager/bookings/${id}/checkout`);

/** GET /api/manager/rooms — rooms for the manager's hotel only */
export const getManagerRooms = (params?: Record<string, any>) =>
  api.get("/manager/rooms", { params });

/** GET /api/manager/rooms/map-overview — floor map for manager's hotel only */
export const getManagerMapOverview = (params?: { date?: string }) =>
  api.get("/manager/rooms/map-overview", { params });

/** POST /api/manager/rooms — create a room scoped to the manager's hotel */
export const createManagerRoom = (data: Record<string, any>) =>
  api.post("/manager/rooms", data);

/** PUT /api/manager/rooms/:id — update a room (hotel-scoped, enforced server-side) */
export const updateManagerRoom = (id: string, data: Record<string, any>) =>
  api.put(`/manager/rooms/${id}`, data);

/** DELETE /api/manager/rooms/:id — delete a room scoped to the manager's hotel */
export const deleteManagerRoom = (id: string) =>
  api.delete(`/manager/rooms/${id}`);

/** GET /api/manager/guests — guests for the manager's hotel only */
export const getManagerGuests = () => api.get("/manager/guests");

/** GET /api/manager/guests/additional — additional guests scoped to hotel */
export const getManagerAdditionalGuests = (email?: string) =>
  api.get(`/manager/guests/additional${email ? `?email=${encodeURIComponent(email)}` : ""}`);

/** GET /api/manager/stats — dashboard stats for the manager's hotel */
export const getManagerStats = () => api.get("/manager/stats");

/**
 * checkHotelAccess — verifies a manager has access to a given hotelId.
 * Used by the hotel switcher to show the Emerald Red error toast on denial.
 */
export const checkHotelAccess = (hotelId: string) =>
  api.get(`/manager/hotel/${hotelId}`);

export const getManagerHalls = () => api.get("/manager/halls");
export const createManagerHall = (data: Record<string, any>) => api.post("/manager/halls", data);
export const updateManagerHall = (id: string, data: Record<string, any>) => api.put(`/manager/halls/${id}`, data);


export const reassignManagerBooking = (bookingId: string, newRoomId: string) =>
  api.put(`/manager/bookings/${bookingId}/reassign`, { newRoomId });

export const getRoomAvailability = (roomId: string, checkIn: string, checkOut: string) =>
  api.get(`/manager/rooms/${roomId}/availability`, { params: { checkIn, checkOut } });

// Admin hotel map — uses admin-scoped room/booking endpoints
/** GET /api/rooms/map-overview — admin hotel floor map with date-based occupancy */
export const getHotelMapOverview = (params: { hotelStringId: string; date?: string }) =>
  api.get("/rooms/map-overview", { params });

export const getAdminRooms = (params?: Record<string, any>) => api.get("/rooms", { params });
export const getAdminBookings = (params?: Record<string, any>) => api.get("/bookings", { params });
export const updateAdminRoom = (id: string, data: Record<string, any>) => api.patch(`/rooms/${id}`, data);
export const updateRoomCleaningStatus = (id: string, data: { cleaningStatus: string }) => api.patch(`/rooms/${id}/cleaning`, data);
export const updateRoomMaintenanceStatus = (id: string, data: { maintenanceStatus: string, blockedReason?: string }) => api.patch(`/rooms/${id}/maintenance`, data);

/**
 * Admin-level booking reassignment (no hotel isolation — cross-hotel capable).
 * Uses /api/admin/bookings/:id/reassign  { newRoomId }
 */
export const adminReassignBooking = (bookingId: string, newRoomId: string) =>
  api.put(`/admin/bookings/${bookingId}/reassign`, { newRoomId });

/**
 * Fetch the last N bookings for a specific room — used in Hotel Map drawer history tab.
 * GET /api/rooms/booking-history/:roomId?limit=5
 */
export const getRoomBookingHistory = (roomId: string, limit = 5) =>
  api.get(`/rooms/booking-history/${roomId}`, { params: { limit } });

/**
 * Get count of rooms available for given hotel/type/dates.
 * GET /api/rooms/available-count?hotelStringId=&roomType=&checkIn=&checkOut=
 * Used by the frontend "Only N rooms left" badge.
 */
export const getAvailableRoomCount = (params: {
  hotelStringId?: string;
  roomType?: string;
  checkIn: string;
  checkOut: string;
}) => api.get("/rooms/available-count", { params });
