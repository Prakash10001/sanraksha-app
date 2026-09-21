import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "../components/Header.jsx";
import AppFooter from "../components/AppFooter.jsx";

const PATIENT_NAV = [
  { label: "My care", to: "/portal" },
  { label: "Appointments", to: "/book" },
  { label: "Records", to: "/portal" },
  { label: "Billing", to: "/portal" },
];

const DEPARTMENTS = ["Cardiology", "Orthopedics", "General medicine", "Pediatrics", "Dermatology"];

const DOCTORS = [
  { name: "Dr. Mehta", meta: "Cardiology · Room 204", nextAvailable: "today" },
  { name: "Dr. Kapoor", meta: "Cardiology · Room 206", nextAvailable: "tomorrow" },
];

const TIME_SLOTS = [
  { label: "9:00 am", available: true },
  { label: "9:45 am", available: true },
  { label: "10:30 am", available: true },
  { label: "11:15 am", available: false },
  { label: "2:00 pm", available: true },
  { label: "2:45 pm", available: true },
];

export default function BookAppointment() {
  const navigate = useNavigate();
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [doctor, setDoctor] = useState(DOCTORS[0].name);
  const [date, setDate] = useState("2026-09-22");
  const [time, setTime] = useState("9:45 am");
  const [reason, setReason] = useState("");

  function handleConfirm() {
    navigate("/book/confirmed", { state: { department, doctor, date, time, reason } });
  }

  return (
    <div>
      <Header
        navLinks={PATIENT_NAV}
        user={{ initials: "AS", name: "Anita Sharma", role: "Patient" }}
      />

      <div className="page narrow">
        <div className="page-head">
          <Link className="back" to="/portal">← Back to my care</Link>
          <h1>Book an appointment</h1>
          <p>Choose a department, doctor, and time that works for you.</p>
        </div>

        <div className="step">
          <div className="step-label">1. What is this visit for?</div>
          <div className="chip-row">
            {DEPARTMENTS.map((d) => (
              <button
                key={d}
                type="button"
                className={`chip ${department === d ? "selected" : ""}`}
                onClick={() => setDepartment(d)}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div className="step">
          <div className="step-label">2. Choose a doctor</div>
          <div className="doctor-list">
            {DOCTORS.map((doc) => (
              <div
                key={doc.name}
                className={`doctor-card ${doctor === doc.name ? "selected" : ""}`}
                onClick={() => setDoctor(doc.name)}
              >
                <div className="doctor-info">
                  <div className="name">{doc.name}</div>
                  <div className="meta">{doc.meta}</div>
                </div>
                <span className="doctor-slot">Next available: {doc.nextAvailable}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="step">
          <div className="step-label">3. Pick a date and time</div>
          <input
            className="date-input"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <div className="time-row">
            {TIME_SLOTS.map((slot) => (
              <button
                key={slot.label}
                type="button"
                disabled={!slot.available}
                className={`time-slot ${time === slot.label ? "selected" : ""} ${!slot.available ? "unavailable" : ""}`}
                onClick={() => setTime(slot.label)}
              >
                {slot.label}
              </button>
            ))}
          </div>
        </div>

        <div className="step">
          <div className="step-label">4. Reason for visit (optional)</div>
          <textarea
            placeholder="e.g. follow-up on blood pressure medication"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>

        <div className="summary-panel">
          <h3>Review your appointment</h3>
          <div className="summary-row"><span>Department</span><span>{department}</span></div>
          <div className="summary-row"><span>Doctor</span><span>{doctor}</span></div>
          <div className="summary-row"><span>Date &amp; time</span><span>{date}, {time}</span></div>
        </div>

        <button type="button" className="confirm-btn" onClick={handleConfirm}>
          Confirm appointment
        </button>
      </div>

      <AppFooter />
    </div>
  );
}
