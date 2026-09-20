import { Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import PatientPortal from "./pages/PatientPortal.jsx";
import BookAppointment from "./pages/BookAppointment.jsx";
import AppointmentConfirmed from "./pages/AppointmentConfirmed.jsx";
import ManageAppointment from "./pages/ManageAppointment.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/portal" element={<PatientPortal />} />
      <Route path="/book" element={<BookAppointment />} />
      <Route path="/book/confirmed" element={<AppointmentConfirmed />} />
      <Route path="/manage" element={<ManageAppointment />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
    </Routes>
  );
}
