import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
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
import HotelMap   from "@/pages/HotelMap";
import Bookings   from "@/pages/Bookings";
import Payments   from "@/pages/Payments";
import Guests     from "@/pages/Guests";
import Analytics  from "@/pages/Analytics";
import Revenue    from "@/pages/Revenue";
import Insights   from "@/pages/Insights";
import Managers   from "@/pages/Managers";
import Profile    from "@/pages/Profile";
import Coupons       from "@/pages/Coupons";
import TopDeals      from "@/pages/TopDeals";
import Notifications from "@/pages/Notifications";
import PriceRequests from "@/pages/PriceRequests";
import Settings    from "@/pages/Settings";

// ── Manager pages (role === "Manager") ────────────────────
import MDashboard     from "@/pages/manager/MDashboard";
import MFloorMap      from "@/pages/manager/MFloorMap";
import MBookings      from "@/pages/manager/MBookings";
import MRooms         from "@/pages/manager/MRooms";
import MFinancials    from "@/pages/manager/MFinancials";
import MHotelsOverview from "@/pages/manager/MHotelsOverview";
import MHalls         from "@/pages/manager/MHalls";
import MPricing       from "@/pages/manager/MPricing";
import MProfile       from "@/pages/manager/MProfile";
import MNotifications from "@/pages/manager/MNotifications";
import MChangePassword from "@/pages/manager/MChangePassword";

function AuthenticatedProviders({ children }: { children: React.ReactNode }) {
  return (
    <BookingsProvider>
      <HotelsProvider>
        <RoomsProvider>
          <GuestsProvider>
            <VisitorProvider>{children}</VisitorProvider>
          </GuestsProvider>
        </RoomsProvider>
      </HotelsProvider>
    </BookingsProvider>
  );
}

export default function App() {
  return (
    <AdminProvider>
      <BrowserRouter>
        <Routes>
          {/* ── Public ── */}
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route
            element={
              <ProtectedRoute>
                <AuthenticatedProviders>
                  <Outlet />
                </AuthenticatedProviders>
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/hotels" element={<Hotels />} />
            <Route path="/hotel/:id" element={<HotelDetail />} />
            <Route path="/rooms" element={<Rooms />} />
            <Route path="/hotel-map" element={<HotelMap />} />
            <Route path="/bookings" element={<Bookings />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/guests" element={<Guests />} />
            <Route path="/revenue" element={<Revenue />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/managers" element={<Managers />} />
            <Route path="/coupons" element={<Coupons />} />
            <Route path="/top-deals" element={<TopDeals />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/price-requests" element={<PriceRequests />} />
            <Route path="/settings" element={<Settings />} />

            <Route path="/m/dashboard" element={<MDashboard />} />
            <Route path="/m/hotel-map" element={<MFloorMap />} />
            <Route path="/m/floor-map" element={<Navigate to="/m/hotel-map" replace />} />
            <Route path="/m/bookings" element={<MBookings />} />
            <Route path="/m/rooms" element={<MRooms />} />
            <Route path="/m/financials" element={<MFinancials />} />
            <Route path="/m/hotels-overview" element={<MHotelsOverview />} />
            <Route path="/m/halls" element={<MHalls />} />
            <Route path="/m/pricing" element={<MPricing />} />
            <Route path="/m/profile" element={<MProfile />} />
            <Route path="/m/notifications" element={<MNotifications />} />
            <Route path="/m/change-password" element={<MChangePassword />} />
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AdminProvider>
  );
}
