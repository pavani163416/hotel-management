import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AdminProvider } from "@/context/AdminContext";
import { BookingsProvider } from "@/context/BookingsContext";
import { HotelsProvider } from "@/context/HotelsContext";
import { RoomsProvider } from "@/context/RoomsContext";
import { GuestsProvider } from "@/context/GuestsContext";
import { VisitorProvider } from "@/context/VisitorContext";
import ProtectedRoute from "@/components/ProtectedRoute";

// ── Admin pages ───────────────────────────────────────────
import Login      from "@/pages/Login";
import ResetPassword from "@/pages/ResetPassword";
import Dashboard  from "@/pages/Dashboard";
import Hotels     from "@/pages/Hotels";
import HotelDetail from "@/pages/HotelDetail";
import Rooms      from "@/pages/Rooms";
import Bookings   from "@/pages/Bookings";
import Payments   from "@/pages/Payments";
import Guests     from "@/pages/Guests";
import Analytics  from "@/pages/Analytics";
import Revenue    from "@/pages/Revenue";
import Insights   from "@/pages/Insights";
import Managers   from "@/pages/Managers";
import Profile    from "@/pages/Profile";
import PriceRequests from "@/pages/PriceRequests";
import Coupons       from "@/pages/Coupons";
import TopDeals      from "@/pages/TopDeals";
import Amenities     from "@/pages/Amenities";

// ── Manager pages (role === "Manager") ────────────────────
import MDashboard     from "@/pages/manager/MDashboard";
import MFloorMap      from "@/pages/manager/MFloorMap";
import MBookings      from "@/pages/manager/MBookings";
import MRooms         from "@/pages/manager/MRooms";
import MHousekeeping  from "@/pages/manager/MHousekeeping";
import MFinancials    from "@/pages/manager/MFinancials";
import MHotelsOverview from "@/pages/manager/MHotelsOverview";
import MHalls         from "@/pages/manager/MHalls";
import MPricing       from "@/pages/manager/MPricing";
import MProfile       from "@/pages/manager/MProfile";

// ── Staff pages ───────────────────────────────────────────
import StaffLogin     from "@/pages/staff/StaffLogin";
import StaffDashboard from "@/pages/staff/StaffDashboard";

export default function App() {
  return (
    <AdminProvider>
      <BookingsProvider>
        <HotelsProvider>
          <RoomsProvider>
            <GuestsProvider>
              <VisitorProvider>
                <BrowserRouter>
                  <Routes>
                    {/* ── Public ── */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    
                    {/* ── Staff routes (Mobile First) ── */}
                    <Route path="/staff/login" element={<StaffLogin />} />
                    <Route path="/staff/dashboard" element={<StaffDashboard />} />
                    
                    <Route path="/"      element={<Navigate to="/dashboard" replace />} />

                    {/* ── Admin routes (Super Admin / Staff) ── */}
                    <Route path="/dashboard"   element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                    <Route path="/hotels"      element={<ProtectedRoute><Hotels /></ProtectedRoute>} />
                    <Route path="/hotel/:id"   element={<ProtectedRoute><HotelDetail /></ProtectedRoute>} />
                    <Route path="/rooms"       element={<ProtectedRoute><Rooms /></ProtectedRoute>} />
                    <Route path="/bookings"    element={<ProtectedRoute><Bookings /></ProtectedRoute>} />
                    <Route path="/payments"    element={<ProtectedRoute><Payments /></ProtectedRoute>} />
                    <Route path="/guests"      element={<ProtectedRoute><Guests /></ProtectedRoute>} />
                    <Route path="/revenue"     element={<ProtectedRoute><Revenue /></ProtectedRoute>} />
                    <Route path="/analytics"   element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
                    <Route path="/insights"    element={<ProtectedRoute><Insights /></ProtectedRoute>} />
                    <Route path="/managers"    element={<ProtectedRoute><Managers /></ProtectedRoute>} />
                    <Route path="/price-requests" element={<ProtectedRoute><PriceRequests /></ProtectedRoute>} />
                    <Route path="/coupons"        element={<ProtectedRoute><Coupons /></ProtectedRoute>} />
                    <Route path="/top-deals"      element={<ProtectedRoute><TopDeals /></ProtectedRoute>} />
                    <Route path="/amenities"      element={<ProtectedRoute><Amenities /></ProtectedRoute>} />
                    <Route path="/profile"        element={<ProtectedRoute><Profile /></ProtectedRoute>} />

                    {/* ── Manager routes (role === "Manager") ── */}
                    <Route path="/m/dashboard"       element={<ProtectedRoute><MDashboard /></ProtectedRoute>} />
                    <Route path="/m/floor-map"       element={<ProtectedRoute><MFloorMap /></ProtectedRoute>} />
                    <Route path="/m/bookings"        element={<ProtectedRoute><MBookings /></ProtectedRoute>} />
                    <Route path="/m/rooms"           element={<ProtectedRoute><MRooms /></ProtectedRoute>} />
                    <Route path="/m/housekeeping"    element={<ProtectedRoute><MHousekeeping /></ProtectedRoute>} />
                    <Route path="/m/financials"      element={<ProtectedRoute><MFinancials /></ProtectedRoute>} />
                    <Route path="/m/hotels-overview" element={<ProtectedRoute><MHotelsOverview /></ProtectedRoute>} />
                    <Route path="/m/halls"           element={<ProtectedRoute><MHalls /></ProtectedRoute>} />
                    <Route path="/m/pricing"         element={<ProtectedRoute><MPricing /></ProtectedRoute>} />
                    <Route path="/m/profile"         element={<ProtectedRoute><MProfile /></ProtectedRoute>} />

                    {/* ── Catch-all ── */}
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                  </Routes>
                </BrowserRouter>
              </VisitorProvider>
            </GuestsProvider>
          </RoomsProvider>
        </HotelsProvider>
      </BookingsProvider>
    </AdminProvider>
  );
}
