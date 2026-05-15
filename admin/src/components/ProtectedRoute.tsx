import { Navigate, useLocation } from "react-router-dom";
import { useAdmin } from "@/context/AdminContext";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isManager } = useAdmin();
  const location = useLocation();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // If Manager tries to access admin routes, redirect to manager dashboard
  if (isManager && !location.pathname.startsWith("/m/")) {
    return <Navigate to="/m/dashboard" replace />;
  }

  // If non-Manager tries to access manager routes, redirect to admin dashboard
  if (!isManager && location.pathname.startsWith("/m/")) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
