import { Link, useLocation } from "react-router-dom";
import Header from "../components/Header.jsx";
import AppFooter from "../components/AppFooter.jsx";

const PATIENT_NAV = [
  { label: "My care", to: "/portal" },
  { label: "Appointments", to: "/book" },
  { label: "Records", to: "/portal" },
  { label: "Billing", to: "/portal" },
];

export default function AppointmentConfirmed() {
  const { state } = useLocation();
  const details = state || {
    department: "Cardiology",
    doctor: "Dr. Mehta",
    date: "2026-09-22",
    time: "9:45 am",
    reason: "Follow-up on blood pressure medication",
  };

  return (
    <div>
      <Header
        navLinks={PATIENT_NAV}
        user={{ initials: "AS", name: "Anita Sharma", role: "Patient" }}
      />

      <div className="page centered">
        <div className="status-icon success">
          <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
            <path d="M6 15 L12 21 L24 8" fill="none" stroke="#2e6b46" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <h1 style={{ fontFamily: "Georgia, serif", fontSize: 26, margin: "0 0 10px" }}>
          Your appointment is confirmed
        </h1>
        <p style={{ color: "var(--ink-soft)", marginBottom: 36 }}>
          A confirmation has been sent to your registered phone number and email.
        </p>

        <div className="detail-card" style={{ textAlign: "left" }}>
          <div className="ref-line">Booking reference <span>SNJ-48213</span></div>
          <div className="detail-row"><span>Department</span><span>{details.department}</span></div>
          <div className="detail-row"><span>Doctor</span><span>{details.doctor}</span></div>
          <div className="detail-row"><span>Date &amp; time</span><span>{details.date}, {details.time}</span></div>
          <div className="detail-row"><span>Location</span><span>Room 204, 2nd floor</span></div>
          {details.reason && (
            <div className="detail-row"><span>Reason</span><span>{details.reason}</span></div>
          )}
        </div>

        <div className="reminder-note">
          <span>Please arrive 15 minutes early to complete check-in, and bring any previous reports related to this visit.</span>
        </div>

        <div className="action-row">
          <button className="btn-primary">Add to calendar</button>
          <Link className="btn-secondary" to="/portal">Back to my care</Link>
        </div>

        <Link className="cancel-link" to="/manage">Need to cancel or reschedule?</Link>
      </div>

      <AppFooter />
    </div>
  );
}
