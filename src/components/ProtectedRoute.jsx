import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProtectedRoute({ allowedRoles = [], redirectPath = "/login" }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to={redirectPath} replace />;
  }

  const normalizedRole = String(user.role || "").toUpperCase();

  if (allowedRoles.length > 0 && !allowedRoles.includes(normalizedRole)) {
    if (normalizedRole === "DOCTOR") return <Navigate to="/doctor-dashboard" replace />;
    if (normalizedRole === "ADMIN") return <Navigate to="/admin-dashboard" replace />;
    return <Navigate to="/patient-dashboard" replace />;
  }

  return <Outlet />;
}
