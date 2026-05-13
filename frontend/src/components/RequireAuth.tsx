import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useBooking } from "@/context/BookingContext";

/**
 * Wraps booking-flow pages only (/booking, /guest-details, /review, /payment, /confirmation).
 * If not authenticated → redirects to home with Sign In modal auto-opening.
 * History and Profile handle their own inline auth UI — NOT wrapped here.
 */
const RequireAuth = ({ children }: { children: React.ReactNode }) => {
  const { user } = useBooking();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!user) {
      sessionStorage.setItem("redirectAfterLogin", location.pathname);
      navigate("/", { replace: true, state: { openAuth: true } });
    }
  }, [user, navigate, location.pathname]);

  if (!user) return null;

  return <>{children}</>;
};

export default RequireAuth;
