import { Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing.jsx";
import PatientDashboard from "./pages/PatientDashboard.jsx";
import DoctorDashboard from "./pages/DoctorDashboard.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import PatientPortal from "./pages/PatientPortal.jsx";
import BookAppointment from "./pages/BookAppointment.jsx";
import AppointmentConfirmed from "./pages/AppointmentConfirmed.jsx";
import ManageAppointment from "./pages/ManageAppointment.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/patient-dashboard" element={<PatientDashboard />} />
      <Route path="/doctor-dashboard" element={<DoctorDashboard />} />
      <Route path="/admin-dashboard" element={<AdminDashboard />} />
      <Route path="/portal" element={<PatientPortal />} />
      <Route path="/book" element={<BookAppointment />} />
      <Route path="/book/confirmed" element={<AppointmentConfirmed />} />
      <Route path="/manage" element={<ManageAppointment />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
    </Routes>
  );
}