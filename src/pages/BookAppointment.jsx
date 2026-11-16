import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Header from "../components/Header.jsx";
import AppFooter from "../components/AppFooter.jsx";
import axiosClient from "../api/axiosClient.js";
import { useAuth } from "../context/AuthContext.jsx";
import DOCTOR_SPECIALIZATIONS from "../utils/doctorSpecializations.js";
import TIME_SLOTS from "../utils/appointmentTimeSlots.js";

const PATIENT_NAV = [
  { label: "My care", to: "/portal" },
  { label: "Appointments", to: "/book" },
  { label: "Records", to: "/portal" },
  { label: "Billing", to: "/portal" },
];

function getSlotKey(doctorId, date, time) {
  return `${doctorId}|${date}|${time}`;
}

function isAppointmentConflict(error) {
  const message = String(
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.response?.data?.detail ||
    error?.message ||
    ""
  );
  return error?.response?.status === 409 ||
    error?.response?.status === 423 ||
    /\b(already booked|already taken|not available|unavailable|time slot|appointment conflict)\b/i.test(message);
}

function getToday() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${today.getFullYear()}-${month}-${day}`;
}

export default function BookAppointment() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const defaultDepartment = location.state?.department || DOCTOR_SPECIALIZATIONS[0];
  const [department, setDepartment] = useState(defaultDepartment);
  const [doctors, setDoctors] = useState([]);
  const [doctorId, setDoctorId] = useState("");
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [doctorError, setDoctorError] = useState("");
  const [date, setDate] = useState(getToday);
  const [time, setTime] = useState(TIME_SLOTS[0].label);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [unavailableSlots, setUnavailableSlots] = useState(() => new Set());
  const [bookingError, setBookingError] = useState("");
  const displayName = user?.fullName || user?.name || user?.email || "Patient";
  const initials = displayName
    .split(" ")
    .map((namePart) => namePart[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    setDepartment(defaultDepartment);
  }, [defaultDepartment]);

  useEffect(() => {
    axiosClient
      .get("/doctors")
      .then((response) => {
        const data = response.data;
        const doctorList = Array.isArray(data)
          ? data
          : data.doctors || data.doctorList || data.content || data.items || data.data || [];
        const normalizedDoctors = doctorList
          .filter((item) => String(item.approvalStatus || item.status || "").toUpperCase() === "APPROVED")
          .map((item) => ({
            id: item.id,
            name: item.user?.fullName || item.fullName || item.name || "Unnamed doctor",
            specialization: item.specialization || item.department || "General medicine",
            department: item.department || item.specialization || "General medicine",
            nextAvailable: item.availableFrom && item.availableTo
              ? `${item.availableFrom} - ${item.availableTo}`
              : "available",
          }));

        setDoctors(normalizedDoctors);
      })
      .catch((error) => {
        setDoctors([]);
        setDoctorError(
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          `Unable to load doctors (${error?.response?.status || "backend error"}).`
        );
      })
      .finally(() => setLoadingDoctors(false));
  }, []);

  const matchingDoctors = doctors.filter((doc) => {
    const selectedDepartment = String(department).trim().toLowerCase();
    return [doc.specialization, doc.department].some(
      (value) => String(value || "").trim().toLowerCase() === selectedDepartment
    );
  });
  const selectedDoctor = matchingDoctors.find((doc) => String(doc.id) === String(doctorId));
  const selectedSlotUnavailable = TIME_SLOTS.find((slot) => slot.label === time)?.available === false ||
    Boolean(selectedDoctor && unavailableSlots.has(getSlotKey(selectedDoctor.id, date, time)));

  useEffect(() => {
    if (!matchingDoctors.some((doc) => String(doc.id) === String(doctorId))) {
      const firstDoctorId = matchingDoctors[0]?.id;
      setDoctorId(firstDoctorId === undefined || firstDoctorId === null ? "" : String(firstDoctorId));
    }
  }, [department, doctors]);

  async function handleConfirm() {
    setSubmitting(true);

    try {
      if (!selectedDoctor) {
        window.alert("Please select an available doctor.");
        return;
      }
      const [timeValue, meridiem] = time.split(" ");
      let [hours, minutes] = timeValue.split(":").map(Number);

      if (meridiem === "pm" && hours !== 12) hours += 12;
      if (meridiem === "am" && hours === 12) hours = 0;

      const appointmentDate = `${date}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
      const response = await axiosClient.post("/appointments", {
        doctorId: selectedDoctor.id,
        appointmentDate,
        reason,
      });

      navigate("/book/confirmed", {
        state: { department, doctor: selectedDoctor.name, date, time, reason, appointment: response.data },
      });
    } catch (error) {
      if (isAppointmentConflict(error)) {
        setUnavailableSlots((current) => new Set(current).add(getSlotKey(selectedDoctor.id, date, time)));
        setBookingError("That appointment time has just been booked. Please choose another available time.");
      } else {
        window.alert(error?.response?.data?.message || error?.response?.data?.error || "Unable to book the appointment.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <Header
        navLinks={PATIENT_NAV}
        user={{ initials, name: displayName, role: "Patient" }}
      />

      <div className="page narrow">
        <div className="page-head">
          <Link className="back" to="/portal">← Back to my care</Link>
          <h1>Book an appointment</h1>
          <p>Tell us what you need care for, then choose a matching doctor and appointment time.</p>
        </div>

        <div className="step">
          <div className="step-label">1. What is this visit for?</div>
          <div className="specialty-list" role="group" aria-label="Choose a medical specialty">
            {DOCTOR_SPECIALIZATIONS.map((d) => (
              <button
                key={d}
                type="button"
                className={`specialty-link ${department === d ? "selected" : ""}`}
                aria-pressed={department === d}
                onClick={() => {
                  setDepartment(d);
                  setDoctorId("");
                  setBookingError("");
                  setBookingError("");
                }}
              >
                <span>{d}</span>
                <span className="specialty-link-indicator" aria-hidden="true">
                  {department === d ? "✓" : "›"}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="step">
          <div className="step-label">2. Choose a doctor</div>
          <div className="doctor-list">
            {loadingDoctors ? (
              <p>Loading doctors...</p>
            ) : doctors.length === 0 ? (
              <p>{doctorError || "No doctors available."}</p>
            ) : matchingDoctors.length === 0 ? (
              <p>No approved doctors are available for {department}. Please choose another visit category.</p>
            ) : matchingDoctors.map((doc) => {
              const initials = doc.name
                .replace(/^Dr\.?\s*/i, "")
                .split(/\s+/)
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();

              return (
                <button
                  key={doc.id}
                  type="button"
                  className={`doctor-card ${String(doctorId) === String(doc.id) ? "selected" : ""}`}
                  onClick={() => setDoctorId(String(doc.id))}
                  aria-pressed={String(doctorId) === String(doc.id)}
                >
                  <span className="doctor-avatar" aria-hidden="true">{initials}</span>
                  <span className="doctor-info">
                    <span className="name">{doc.name.startsWith("Dr.") ? doc.name : `Dr. ${doc.name}`}</span>
                    <span className="meta">{doc.specialization}</span>
                    <span className="meta">{doc.department}</span>
                  </span>
                  <span className="doctor-slot">Next available: {doc.nextAvailable}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="step">
          <div className="step-label">3. Pick a date and time</div>
          <input
            className="date-input"
            type="date"
            min={getToday()}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <div className="time-row">
            {TIME_SLOTS.map((slot) => {
              const isUnavailable = !slot.available ||
                (selectedDoctor && unavailableSlots.has(getSlotKey(selectedDoctor.id, date, slot.label)));

              return (
                <button
                  key={slot.label}
                  type="button"
                  disabled={isUnavailable}
                  className={`time-slot ${time === slot.label ? "selected" : ""} ${isUnavailable ? "unavailable" : ""}`}
                  onClick={() => setTime(slot.label)}
                >
                  {isUnavailable ? `${slot.label} · Not available` : slot.label}
                </button>
              );
            })}
          </div>
          {bookingError && <p className="auth-error" role="alert">{bookingError}</p>}
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
          <div className="summary-row"><span>Doctor</span><span>{selectedDoctor?.name || "Choose a matching doctor"}</span></div>
          <div className="summary-row"><span>Date &amp; time</span><span>{date}, {time}</span></div>
        </div>

        <button type="button" className="confirm-btn" onClick={handleConfirm} disabled={submitting || !selectedDoctor || selectedSlotUnavailable}>
          {submitting ? "Booking..." : "Confirm appointment"}
        </button>
      </div>

      <AppFooter />
    </div>
  );
}
