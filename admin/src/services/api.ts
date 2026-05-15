import axios from "axios";

const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({ baseURL: BASE, timeout: 15000 });

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
    if (e.response?.status === 401) {
      // Token expired or invalid — clear session and redirect
      localStorage.removeItem("luxe_admin_token");
      localStorage.removeItem("luxe_admin");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(new Error(e.response?.data?.message || e.message));
  }
);

// ════════════════════════════════════════════════════════
// AUTH
// POST /api/admin/login  { email, password }
// ════════════════════════════════════════════════════════
export const adminLogin = (email: string, password: string) =>
  api.post("/admin/login", { email, password });

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
