import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "../components/Header.jsx";
import AppFooter from "../components/AppFooter.jsx";
import axiosClient from "../api/axiosClient.js";
import { useAuth } from "../context/AuthContext.jsx";

const PATIENT_NAV = [
  { label: "My care", to: "/portal" },
  { label: "Appointments", to: "/book" },
  { label: "Records", to: "/patient-dashboard" },
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

function getToday() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${today.getFullYear()}-${month}-${day}`;
}

function getApiErrorMessage(error, fallback) {
  const responseData = error?.response?.data;
  if (typeof responseData === "string" && responseData.trim()) return responseData;
  if (responseData?.message) return responseData.message;
  if (responseData?.error) return responseData.error;
  if (responseData && typeof responseData === "object") {
    const fieldErrors = Object.values(responseData).filter((value) => typeof value === "string");
    if (fieldErrors.length) return fieldErrors.join(" ");
  }
  return fallback;
}

const defaultAppointment = {
  id: null,
  reference: "—",
  department: "General medicine",
  doctor: "Doctor",
  dateTime: "—",
  location: "Hospital clinic",
  status: "SCHEDULED",
};

function normalizeAppointment(item) {
  return {
    id: item.id || item.appointmentId || item.appointment_id || item._id || null,
    reference: item.reference || `APPT-${item.id || "000"}`,
    department: item.department || item.doctor?.specialization || "General medicine",
    doctor: item.doctorName || item.doctor?.user?.fullName || item.doctor?.fullName || "Doctor",
    dateTime: item.appointmentDate ? new Date(item.appointmentDate).toLocaleString() : item.dateTime || item.date || "To be scheduled",
    location: item.location || item.clinic || "Hospital clinic",
    status: String(item.status || item.appointmentStatus || item.state || "SCHEDULED").toUpperCase(),
    reason: item.reason || "General consultation",
    appointmentDate: item.appointmentDate || item.date || "",
  };
}

export default function ManageAppointment() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [appointment, setAppointment] = useState(defaultAppointment);
  const [view, setView] = useState("main");
  const [newDate, setNewDate] = useState(getToday);
  const [selectedTime, setSelectedTime] = useState("10:30 am");
  const [cancelReason, setCancelReason] = useState(CANCEL_REASONS[0]);
  const [cancelNote, setCancelNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [rescheduling, setRescheduling] = useState(false);
  const [error, setError] = useState("");

  const displayName = user?.fullName || user?.name || user?.email || "Patient";
  const initials = displayName
    .split(" ")
    .map((namePart) => namePart[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    let ignore = false;

    axiosClient
      .get("/appointments/me")
      .then((response) => {
        const data = response.data;
        const list = Array.isArray(data) ? data : data.appointments || data.items || data.content || data.data || [];
        const activeAppointment = list.find((item) => String(item.status || item.appointmentStatus || item.state || "").toUpperCase() !== "CANCELLED");

        if (!ignore) {
          if (activeAppointment) {
            const normalized = normalizeAppointment(activeAppointment);
            setAppointment(normalized);
            if (normalized.appointmentDate) setNewDate(normalized.appointmentDate.slice(0, 10));
          } else {
            setAppointment({ ...defaultAppointment, status: "CANCELLED" });
          }
        }
      })
      .catch(() => {
        if (!ignore) {
          setAppointment({ ...defaultAppointment, status: "CANCELLED" });
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  async function handleCancelConfirm() {
    if (!appointment.id) {
      setError("There is no active appointment to cancel.");
      return;
    }

    setError("");

    try {
      await axiosClient.patch(`/appointments/${appointment.id}/cancel`, {
        cancelReason,
        cancelNote,
      });
    } catch (firstError) {
      try {
        await axiosClient.put(`/appointments/${appointment.id}/status`, null, {
          params: { status: "CANCELLED" },
        });
      } catch (secondError) {
        setError(secondError?.response?.data?.message || secondError?.response?.data?.error || "Unable to cancel this appointment right now.");
        return;
      }
    }

    setAppointment((current) => ({ ...current, status: "CANCELLED" }));
    setView("cancelled");
  }

  async function handleRescheduleConfirm() {
    if (!appointment.id || !newDate) {
      setError("Choose a valid date and time before confirming.");
      return;
    }

    const [timeValue, meridiem] = selectedTime.split(" ");
    let [hours, minutes] = timeValue.split(":").map(Number);
    if (meridiem === "pm" && hours !== 12) hours += 12;
    if (meridiem === "am" && hours === 12) hours = 0;
    const appointmentDate = `${newDate}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;

    if (new Date(appointmentDate) <= new Date()) {
      setError("Choose a future date and time for the appointment.");
      return;
    }

    setError("");
    setRescheduling(true);
    try {
      await axiosClient.patch(`/appointments/${appointment.id}/reschedule`, { appointmentDate });
      setAppointment((current) => ({
        ...current,
        appointmentDate,
        dateTime: new Date(appointmentDate).toLocaleString(),
      }));
      setView("rescheduled");
    } catch (rescheduleError) {
      setError(getApiErrorMessage(rescheduleError, "Unable to reschedule this appointment."));
    } finally {
      setRescheduling(false);
    }
  }

  const isCancelled = String(appointment.status || "").toUpperCase() === "CANCELLED";

  return (
    <div>
      <Header
        navLinks={PATIENT_NAV}
        user={{ initials, name: displayName, role: "Patient" }}
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

            {loading ? (
              <p>Loading appointment details...</p>
            ) : isCancelled || !appointment.id ? (
              <div className="panel">
                <h2>No active appointment</h2>
                <p>You do not have an active appointment to manage right now.</p>
                <div className="panel-actions" style={{ marginTop: 18 }}>
                  <button className="btn-primary" type="button" onClick={() => navigate("/portal")}>Back to main page</button>
                  <Link className="btn-text" to="/book">Book a new appointment</Link>
                </div>
              </div>
            ) : (
              <>
                <div className="detail-card">
                  <div className="detail-row"><span>Booking reference</span><span>{appointment.reference}</span></div>
                  <div className="detail-row"><span>Department</span><span>{appointment.department}</span></div>
                  <div className="detail-row"><span>Doctor</span><span>{appointment.doctor}</span></div>
                  <div className="detail-row"><span>Date &amp; time</span><span>{appointment.dateTime}</span></div>
                  <div className="detail-row"><span>Location</span><span>{appointment.location}</span></div>
                  <div className="detail-row"><span>Status</span><span>{appointment.status}</span></div>
                </div>

                <div className="action-row">
                  <button className="btn-primary" onClick={() => setView("reschedule")}>Reschedule</button>
                  <button className="btn-danger-outline" onClick={() => setView("cancel")}>Cancel appointment</button>
                </div>
              </>
            )}
          </>
        )}

        {view === "reschedule" && (
          <div className="panel" style={{ marginTop: 24 }}>
            <h2>Choose a new time</h2>
            <div className="step-label">With {appointment.doctor} · {appointment.department}</div>
            {error && <div className="auth-error" role="alert">{error}</div>}
            <input
              className="date-input"
              type="date"
              min={getToday()}
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
              <button className="btn-primary" style={{ flex: "none" }} onClick={handleRescheduleConfirm} disabled={rescheduling}>
                {rescheduling ? "Saving..." : "Confirm new time"}
              </button>
              <button className="btn-text" onClick={() => setView("main")}>Never mind</button>
            </div>
            <div className="panel-actions" style={{ marginTop: 16 }}>
              <button className="btn-text" type="button" onClick={() => navigate("/portal")}>Back to main page</button>
            </div>
          </div>
        )}

        {view === "cancel" && (
          <div className="panel" style={{ marginTop: 24 }}>
            <h2>Cancel this appointment</h2>
            {error && <div className="auth-error" role="alert">{error}</div>}
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
              <button className="btn-danger" onClick={handleCancelConfirm}>Confirm cancellation</button>
              <button className="btn-text" onClick={() => setView("main")}>Keep appointment</button>
            </div>
            <div className="panel-actions" style={{ marginTop: 12 }}>
              <button className="btn-text" type="button" onClick={() => navigate("/portal")}>Back to main page</button>
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
              Your visit with {appointment.doctor} is now set for {appointment.dateTime}.
            </p>
            <div className="panel-actions" style={{ justifyContent: "center", marginTop: 24 }}>
              <button className="btn-primary" type="button" onClick={() => navigate("/portal")}>Back to main page</button>
            </div>
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
            <div className="panel-actions" style={{ justifyContent: "center", marginTop: 24 }}>
              <button className="btn-primary" type="button" onClick={() => navigate("/portal")}>Back to main page</button>
              <Link className="btn-text" to="/book">Book a new appointment</Link>
            </div>
          </div>
        )}
      </div>

      <AppFooter />
    </div>
  );
}
