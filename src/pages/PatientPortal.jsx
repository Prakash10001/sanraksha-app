import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header.jsx";
import AppFooter from "../components/AppFooter.jsx";
import axiosClient from "../api/axiosClient.js";
import { useAuth } from "../context/AuthContext.jsx";

const PATIENT_NAV = [
  { label: "My care", to: "/portal" },
  { label: "Appointments", to: "/book" },
  { label: "Records", to: "/portal" },
  { label: "Billing", to: "/portal" },
];

function readCancelledAppointment() {
  try {
    const saved = localStorage.getItem("sanraksha_current_appointment");
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function getAppointmentDateParts(value) {
  if (!value) return { day: "--", month: "DATE", full: "Date to be confirmed" };
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return { day: "--", month: "TIME", full: String(value) };
  }
  return {
    day: parsedDate.toLocaleDateString(undefined, { day: "2-digit" }),
    month: parsedDate.toLocaleDateString(undefined, { month: "short" }).toUpperCase(),
    full: parsedDate.toLocaleString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }),
  };
}

export default function PatientPortal() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointmentIndex, setSelectedAppointmentIndex] = useState(0);

  const displayName = user?.fullName || user?.name || user?.email || "Patient";
  const initials = displayName
    .split(" ")
    .map((namePart) => namePart[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    axiosClient
      .get("/appointments/me")
      .then((response) => {
        const data = response.data;
        setAppointments(Array.isArray(data) ? data : data.appointments || data.items || data.content || data.data || []);
      })
      .catch(() => setAppointments([]))
      .finally(() => setLoading(false));
  }, []);

  const cancelledAppointment = readCancelledAppointment();
  const selectedAppointment = appointments[Math.min(selectedAppointmentIndex, Math.max(appointments.length - 1, 0))];
  const dateParts = getAppointmentDateParts(selectedAppointment?.appointmentDate || selectedAppointment?.date || selectedAppointment?.time);
  const doctorName = selectedAppointment?.doctorName || selectedAppointment?.doctor?.user?.fullName || selectedAppointment?.doctor?.fullName || "Doctor to be assigned";
  const isCancelledByStorage = cancelledAppointment && String(cancelledAppointment.id) === String(selectedAppointment?.id) && cancelledAppointment.status === "CANCELLED";
  const appointmentStatus = isCancelledByStorage ? "CANCELLED" : String(selectedAppointment?.status || selectedAppointment?.appointmentStatus || "PENDING").toUpperCase();

  return (
    <div>
      <Header
        navLinks={PATIENT_NAV}
        user={{ initials, name: displayName, role: "Patient" }}
      />

      <div className="page">
        <div className="page-head">
          <h1>Welcome back, {displayName}</h1>
          <p>Here's your care at a glance — only your own records, visible to you and your care team.</p>
        </div>

        <section className="portal-appointment-carousel" aria-label="Your appointments" aria-live="polite">
          <div className="portal-carousel-topline">
            <span>{appointments.length > 0 ? "YOUR APPOINTMENTS" : "YOUR CARE"}</span>
            {appointments.length > 0 && <span className="portal-carousel-count">{selectedAppointmentIndex + 1} <i>/</i> {appointments.length}</span>}
          </div>

          {loading ? (
            <div className="portal-carousel-empty"><h2>Loading your appointments...</h2></div>
          ) : selectedAppointment ? (
            <div className="portal-carousel-content" key={selectedAppointment.id || selectedAppointmentIndex}>
              <div className="portal-date-tile" aria-label={dateParts.full}>
                <span>{dateParts.month}</span>
                <strong>{dateParts.day}</strong>
                <small>VISIT</small>
              </div>
              <div className="portal-appointment-copy">
                <div className={`portal-appointment-status ${appointmentStatus.toLowerCase()}`}>{appointmentStatus}</div>
                <h2>{doctorName}</h2>
                <p className="portal-appointment-date">{dateParts.full}</p>
                <p className="portal-appointment-reason">{selectedAppointment.reason || selectedAppointment.notes || "General consultation"}</p>
                <div className="portal-carousel-actions">
                  <div className="portal-carousel-links">
                    {appointmentStatus !== "CANCELLED" && <Link className="portal-carousel-book" to="/manage">Reschedule</Link>}
                    <Link className="portal-carousel-book" to="/book">Book another appointment</Link>
                  </div>
                  <div className="portal-carousel-controls" aria-label="Appointment navigation">
                    <button type="button" aria-label="Previous appointment" title="Previous appointment" disabled={selectedAppointmentIndex === 0} onClick={() => setSelectedAppointmentIndex((index) => Math.max(index - 1, 0))}>
                      <span aria-hidden="true">‹</span>
                    </button>
                    <button type="button" aria-label="Next appointment" title="Next appointment" disabled={selectedAppointmentIndex >= appointments.length - 1} onClick={() => setSelectedAppointmentIndex((index) => Math.min(index + 1, appointments.length - 1))}>
                      <span aria-hidden="true">›</span>
                    </button>
                  </div>
                </div>
                {appointments.length > 1 && (
                  <div className="portal-carousel-dots" aria-label="Choose an appointment">
                    {appointments.map((appointment, index) => (
                      <button key={appointment.id || index} type="button" aria-label={`Show appointment ${index + 1}`} aria-current={index === selectedAppointmentIndex ? "step" : undefined} className={index === selectedAppointmentIndex ? "active" : ""} onClick={() => setSelectedAppointmentIndex(index)} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="portal-carousel-empty">
              <div className="portal-empty-mark" aria-hidden="true">+</div>
              <div><h2>No appointments yet</h2><p>Your booked visits will appear here.</p></div>
              <Link className="portal-carousel-book" to="/book">Book an appointment</Link>
            </div>
          )}
        </section>

        <div className="quick-row">
          <Link className="quick-btn" to="/book">Book an appointment</Link>
          <button className="quick-btn">Message your doctor</button>
          <button className="quick-btn">Pay a bill</button>
        </div>

        <div className="panel">
          <h2>Your recent records</h2>
          <p>{appointments.length > 0 ? "Medical records will appear here when provided by the hospital." : "No medical records available yet."}</p>
        </div>

        <div className="panel">
          <h2>Billing</h2>
          <div className="billing-row">
            <div className="billing-amount">
              <span className="value">-</span>
              <span className="label">No billing information available</span>
            </div>
          </div>
        </div>
      </div>

      <AppFooter />
    </div>
  );
}
