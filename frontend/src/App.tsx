import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BookingProvider } from "@/context/BookingContext";
import RequireAuth from "@/components/RequireAuth";

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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <BookingProvider>
          <Routes>
            {/* ── Public routes ─────────────────────── */}
            <Route path="/" element={<Home />} />
            <Route path="/hotels" element={<Hotels />} />
            <Route path="/hotel/:id" element={<HotelDetails />} />

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

            {/* ── These handle their own inline auth UI ─ */}
            <Route path="/history" element={<History />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BookingProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
