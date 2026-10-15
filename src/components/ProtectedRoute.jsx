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
    if (normalizedRole === "LAB_TECH") return <Navigate to="/lab-reports" replace />;
    return <Navigate to="/portal" replace />;
  }

  return <Outlet />;
}
