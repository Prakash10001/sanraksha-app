import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Header from "../components/Header.jsx";
import AppFooter from "../components/AppFooter.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const APPOINTMENT_DURATION_MINUTES = 20;
const APPOINTMENT_LOCATION = "Room 204, 2nd floor";

const PATIENT_NAV = [
  { label: "My care", to: "/portal" },
  { label: "Appointments", to: "/book" },
  { label: "Records", to: "/portal" },
  { label: "Billing", to: "/portal" },
];

function parseAppointmentDateTime(date, time) {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date || ""));
  const timeMatch = /^(\d{1,2}):(\d{2})\s*(am|pm)$/i.exec(String(time || "").trim());

  if (!dateMatch || !timeMatch) return null;

  const [, year, month, day] = dateMatch.map(Number);
  const parsedHours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);
  if (parsedHours < 1 || parsedHours > 12 || minutes > 59) return null;

  let hours = parsedHours % 12;
  if (timeMatch[3].toLowerCase() === "pm") hours += 12;

  const start = new Date(year, month - 1, day, hours, minutes);
  if (
    start.getFullYear() !== year ||
    start.getMonth() !== month - 1 ||
    start.getDate() !== day ||
    start.getHours() !== hours ||
    start.getMinutes() !== minutes
  ) {
    return null;
  }

  return start;
}

function formatUtcDate(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeCalendarText(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function createCalendarFile(details) {
  const start = parseAppointmentDateTime(details.date, details.time);
  if (!start) return null;

  const end = new Date(start.getTime() + APPOINTMENT_DURATION_MINUTES * 60 * 1000);
  const appointmentId = details.appointment?.appointmentId || details.appointment?.id;
  const uidSource = appointmentId || `${details.date}-${details.time}-${details.doctor || "appointment"}`;
  const uid = String(uidSource).replace(/[^a-zA-Z0-9._-]/g, "-");
  const calendar = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Sanraksha//Appointment//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}@sanraksha`,
    `DTSTAMP:${formatUtcDate(new Date())}`,
    `DTSTART:${formatUtcDate(start)}`,
    `DTEND:${formatUtcDate(end)}`,
    "SUMMARY:Medical appointment",
    `LOCATION:${escapeCalendarText(APPOINTMENT_LOCATION)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n") + "\r\n";

  return calendar;
}

export default function AppointmentConfirmed() {
  const { user } = useAuth();
  const { state } = useLocation();
  const details = state || {
    department: "Cardiology",
    doctor: "Dr. Mehta",
    date: "2026-09-22",
    time: "9:45 am",
    reason: "Follow-up on blood pressure medication",
  };
  const displayName = user?.fullName || user?.name || user?.email || "Patient";
  const initials = displayName
    .split(" ")
    .map((namePart) => namePart[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const canAddToCalendar = Boolean(state?.date && state?.time);
  const [calendarError, setCalendarError] = useState("");

  function handleAddToCalendar() {
    const calendarFile = createCalendarFile(details);
    if (!calendarFile) {
      setCalendarError("Unable to create a calendar event because the appointment date or time is invalid.");
      return;
    }

    setCalendarError("");
    const blob = new Blob([calendarFile], { type: "text/calendar;charset=utf-8" });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = `appointment-${details.date}.ics`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
  }

  return (
    <div>
      <Header
        navLinks={PATIENT_NAV}
        user={{ initials, name: displayName, role: "Patient" }}
      />

      <div className="page centered">
        <div className="status-icon success">
          <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
            <path d="M6 15 L12 21 L24 8" fill="none" stroke="#2e6b46" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <h1 style={{ fontFamily: "Georgia, serif", fontSize: 26, margin: "0 0 10px" }}>
          Your appointment is Booked
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
          <button
            className="btn-primary"
            type="button"
            onClick={handleAddToCalendar}
            disabled={!canAddToCalendar}
          >
            Add to calendar
          </button>
          <Link className="btn-secondary" to="/portal">Back to my care</Link>
        </div>
        {calendarError && <p role="alert">{calendarError}</p>}

        <Link className="cancel-link" to="/manage">Need to cancel or reschedule?</Link>
      </div>

      <AppFooter />
    </div>
  );
}
