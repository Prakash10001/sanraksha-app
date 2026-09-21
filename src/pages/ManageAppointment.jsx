import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header.jsx";
import AppFooter from "../components/AppFooter.jsx";

const PATIENT_NAV = [
  { label: "My care", to: "/portal" },
  { label: "Appointments", to: "/book" },
  { label: "Records", to: "/portal" },
  { label: "Billing", to: "/portal" },
];

const TIME_SLOTS = [
  { label: "9:00 am", available: true },
  { label: "9:45 am", available: true },
  { label: "10:30 am", available: true },
  { label: "11:15 am", available: false },
  { label: "2:00 pm", available: true },
];

const CANCEL_REASONS = ["Schedule conflict", "Feeling better", "Finding another doctor", "Other"];

const appointment = {
  reference: "SNJ-48213",
  department: "Cardiology",
  doctor: "Dr. Mehta",
  dateTime: "22 September 2026, 9:45 am",
  location: "Room 204, 2nd floor",
};

export default function ManageAppointment() {
  // "main" | "reschedule" | "cancel" | "rescheduled" | "cancelled"
  const [view, setView] = useState("main");
  const [newDate, setNewDate] = useState("2026-09-24");
  const [selectedTime, setSelectedTime] = useState("10:30 am");
  const [cancelReason, setCancelReason] = useState(CANCEL_REASONS[0]);
  const [cancelNote, setCancelNote] = useState("");

  return (
    <div>
      <Header
        navLinks={PATIENT_NAV}
        user={{ initials: "AS", name: "Anita Sharma", role: "Patient" }}
      />

      <div className="page narrow">

        {view === "main" && (
          <>
            <Link className="back" to="/portal">← Back to my care</Link>
            <h1 style={{ fontFamily: "Georgia, serif", fontSize: 26, margin: "14px 0 6px" }}>
              Manage your appointment
            </h1>
            <p style={{ color: "var(--ink-soft)", marginBottom: 28 }}>
              Reschedule to a new time, or cancel this visit.
            </p>

            <div className="detail-card">
              <div className="detail-row"><span>Booking reference</span><span>{appointment.reference}</span></div>
              <div className="detail-row"><span>Department</span><span>{appointment.department}</span></div>
              <div className="detail-row"><span>Doctor</span><span>{appointment.doctor}</span></div>
              <div className="detail-row"><span>Date &amp; time</span><span>{appointment.dateTime}</span></div>
              <div className="detail-row"><span>Location</span><span>{appointment.location}</span></div>
            </div>

            <div className="action-row">
              <button className="btn-primary" onClick={() => setView("reschedule")}>Reschedule</button>
              <button className="btn-danger-outline" onClick={() => setView("cancel")}>Cancel appointment</button>
            </div>
          </>
        )}

        {view === "reschedule" && (
          <div className="panel" style={{ marginTop: 24 }}>
            <h2>Choose a new time</h2>
            <div className="step-label">With {appointment.doctor} · {appointment.department}</div>
            <input
              className="date-input"
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
            />
            <div className="time-row">
              {TIME_SLOTS.map((slot) => (
                <button
                  key={slot.label}
                  type="button"
                  disabled={!slot.available}
                  className={`time-slot ${selectedTime === slot.label ? "selected" : ""} ${!slot.available ? "unavailable" : ""}`}
                  onClick={() => setSelectedTime(slot.label)}
                >
                  {slot.label}
                </button>
              ))}
            </div>
            <div className="panel-actions">
              <button className="btn-primary" style={{ flex: "none" }} onClick={() => setView("rescheduled")}>
                Confirm new time
              </button>
              <button className="btn-text" onClick={() => setView("main")}>Never mind</button>
            </div>
          </div>
        )}

        {view === "cancel" && (
          <div className="panel" style={{ marginTop: 24 }}>
            <h2>Cancel this appointment</h2>
            <div className="warning-note">
              Cancelling within 24 hours of your appointment may be subject to your hospital's cancellation policy.
            </div>
            <div className="step-label">Reason for cancelling (optional)</div>
            <select
              className="reason-select"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            >
              {CANCEL_REASONS.map((r) => <option key={r}>{r}</option>)}
            </select>
            <textarea
              placeholder="Add any additional details (optional)"
              value={cancelNote}
              onChange={(e) => setCancelNote(e.target.value)}
            />
            <div className="panel-actions">
              <button className="btn-danger" onClick={() => setView("cancelled")}>Confirm cancellation</button>
              <button className="btn-text" onClick={() => setView("main")}>Keep appointment</button>
            </div>
          </div>
        )}

        {view === "rescheduled" && (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div className="status-icon small success">
              <svg width="26" height="26" viewBox="0 0 30 30" aria-hidden="true">
                <path d="M6 15 L12 21 L24 8" fill="none" stroke="#2e6b46" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: 20, margin: "0 0 8px" }}>Appointment rescheduled</h2>
            <p style={{ color: "var(--ink-soft)" }}>
              Your visit with {appointment.doctor} is now set for {newDate}, {selectedTime}. A confirmation has been sent to you.
            </p>
          </div>
        )}

        {view === "cancelled" && (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div className="status-icon small danger">
              <svg width="26" height="26" viewBox="0 0 30 30" aria-hidden="true">
                <line x1="8" y1="8" x2="22" y2="22" stroke="#a13a2a" strokeWidth="3" strokeLinecap="round" />
                <line x1="22" y1="8" x2="8" y2="22" stroke="#a13a2a" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: 20, margin: "0 0 8px" }}>Appointment cancelled</h2>
            <p style={{ color: "var(--ink-soft)" }}>
              Your visit with {appointment.doctor} on {appointment.dateTime} has been cancelled. You can book a new appointment anytime.
            </p>
          </div>
        )}

      </div>

      <AppFooter />
    </div>
  );
}
