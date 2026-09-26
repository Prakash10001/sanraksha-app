import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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

const DEPARTMENTS = ["Cardiology", "Orthopedics", "General medicine", "Pediatrics", "Dermatology"];

const TIME_SLOTS = [
  { label: "9:00 am", available: true },
  { label: "9:45 am", available: true },
  { label: "10:30 am", available: true },
  { label: "11:15 am", available: false },
  { label: "2:00 pm", available: true },
  { label: "2:45 pm", available: true },
];

function getToday() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${today.getFullYear()}-${month}-${day}`;
}

export default function BookAppointment() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [doctors, setDoctors] = useState([]);
  const [doctor, setDoctor] = useState("");
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [doctorError, setDoctorError] = useState("");
  const [date, setDate] = useState(getToday);
  const [time, setTime] = useState("9:45 am");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const displayName = user?.fullName || user?.name || user?.email || "Patient";
  const initials = displayName
    .split(" ")
    .map((namePart) => namePart[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    axiosClient
      .get("/doctors")
      .then((response) => {
        const data = response.data;
        const doctorList = Array.isArray(data)
          ? data
          : data.doctors || data.doctorList || data.content || data.items || data.data || [];
        const normalizedDoctors = doctorList.map((item) => ({
          id: item.id,
          name: item.user?.fullName || item.fullName || item.name || "Unnamed doctor",
          email: item.user?.email || item.email || "",
          specialization: item.specialization || item.department || "General medicine",
          department: item.department || "",
          nextAvailable: item.availableFrom && item.availableTo
            ? `${item.availableFrom} - ${item.availableTo}`
            : "available",
        }));
        setDoctors(normalizedDoctors);
        setDoctor(normalizedDoctors[0]?.name || "");
        setDepartment(normalizedDoctors[0]?.specialization || DEPARTMENTS[0]);
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

  async function handleConfirm() {
    setSubmitting(true);

    try {
      const selectedDoctor = doctors.find((item) => item.name === doctor);
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
        state: { department, doctor, date, time, reason, appointment: response.data },
      });
    } catch (error) {
      window.alert(error?.response?.data?.message || error?.response?.data?.error || "Unable to book the appointment.");
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
            {loadingDoctors ? (
              <p>Loading doctors...</p>
            ) : doctors.length === 0 ? (
              <p>{doctorError || "No doctors available."}</p>
            ) : doctors.map((doc) => (
              <div
                key={doc.name}
                className={`doctor-card ${doctor === doc.name ? "selected" : ""}`}
                onClick={() => setDoctor(doc.name)}
              >
                <div className="doctor-info">
                  <div className="name">{doc.name}</div>
                  <div className="meta">{doc.department || doc.specialization}</div>
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
            min={getToday()}
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

        <button type="button" className="confirm-btn" onClick={handleConfirm} disabled={submitting}>
          {submitting ? "Booking..." : "Confirm appointment"}
        </button>
      </div>

      <AppFooter />
    </div>
  );
}
