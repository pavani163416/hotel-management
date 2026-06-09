import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BookingProvider } from "@/context/BookingContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { CurrencyProvider } from "@/context/CurrencyContext";
import { WishlistProvider } from "@/context/WishlistContext";
import RequireAuth from "@/components/RequireAuth";
import { useEffect } from "react";

// Scroll to the top of the page on every route change
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}

import Home from "./pages/Home";
import Hotels from "./pages/Hotels";
import HotelDetails from "./pages/HotelDetails";
import Booking from "./pages/Booking";
import GuestDetails from "./pages/GuestDetails";
import Review from "./pages/Review";
import Payment from "./pages/Payment";
import Confirmation from "./pages/Confirmation";
import History from "./pages/History";
import Profile from "./pages/Profile";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import Notifications from "./pages/Notifications";
import Wishlist from "./pages/Wishlist";

// ── Footer / Informational pages ─────────────────────────
import About from "./pages/About";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Contact from "./pages/Contact";
import OwnerPortal from "./pages/OwnerPortal";
import SupportCentre from "./pages/SupportCentre";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
        <CurrencyProvider>
        <BookingProvider>
        <WishlistProvider>
          <ScrollToTop />
          <Routes>
            {/* ── Public routes ─────────────────────── */}
            <Route path="/" element={<Home />} />
            <Route path="/hotels" element={<Hotels />} />
            <Route path="/hotel/:id" element={<HotelDetails />} />
            <Route path="/wishlist" element={<Wishlist />} />

            {/* ── Informational / Footer pages ────── */}
            <Route path="/about" element={<About />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/owner-portal" element={<OwnerPortal />} />
            <Route path="/support-centre" element={<SupportCentre />} />

            {/* ── Protected routes (must be signed in) ─ */}
            <Route path="/booking" element={
              <RequireAuth><Booking /></RequireAuth>
            } />
            <Route path="/guest-details" element={
              <RequireAuth><GuestDetails /></RequireAuth>
            } />
            <Route path="/review" element={
              <RequireAuth><Review /></RequireAuth>
            } />
            <Route path="/payment" element={
              <RequireAuth><Payment /></RequireAuth>
            } />
            <Route path="/confirmation" element={
              <RequireAuth><Confirmation /></RequireAuth>
            } />
            <Route path="/notifications" element={
              <RequireAuth><Notifications /></RequireAuth>
            } />

            {/* ── These handle their own inline auth UI ─ */}
            <Route path="/history" element={<History />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </WishlistProvider>
        </BookingProvider>
        </CurrencyProvider>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;

