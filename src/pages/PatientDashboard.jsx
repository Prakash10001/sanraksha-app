import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import axiosClient from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";
import Header from "../components/Header.jsx";
import SiteFooter from "../components/SiteFooter.jsx";
import downloadPrescriptionPdf from "../utils/prescriptionPdf.js";

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

const BOOKING_OPTIONS = [
  {
    title: "General Consultation",
    tag: "New patient",
    description: "For general check-ups, seasonal illness, and first-time visits.",
    department: "General medicine",
  },
  {
    title: "Follow-up Visit",
    tag: "Ongoing care",
    description: "Review your progress, treatment plan, and lab results.",
    department: "General medicine",
  },
  {
    title: "Specialist Care",
    tag: "Expert consult",
    description: "Book with cardiology, orthopedics, dermatology, or pediatrics.",
    department: "Cardiology",
  },
];

export default function PatientDashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const [appointments, setAppointments] = useState([]);
  const [profile, setProfile] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [prescriptionsError, setPrescriptionsError] = useState("");
  const [loading, setLoading] = useState(true);

  const displayName = user?.fullName || user?.name || user?.email || "Patient";
  const initials = displayName
    .split(" ")
    .map((namePart) => namePart[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    Promise.allSettled([
      axiosClient.get("/appointments/me"),
      axiosClient.get("/patients/me"),
      axiosClient.get("/prescriptions/me"),
    ])
      .then(([appointmentsResult, profileResult, prescriptionsResult]) => {
        if (appointmentsResult.status === "fulfilled") {
          const data = appointmentsResult.value.data;
          setAppointments(Array.isArray(data) ? data : data.appointments || data.items || data.content || data.data || []);
        } else {
          setAppointments([]);
        }

        if (profileResult.status === "fulfilled") {
          const data = profileResult.value.data;
          setProfile(data?.patient || data?.data || data);
        }

        if (prescriptionsResult.status === "fulfilled") {
          const data = prescriptionsResult.value.data;
          const list = Array.isArray(data) ? data : data.prescriptions || data.items || data.content || data.data || [];
          setPrescriptions(Array.isArray(list) ? list : []);
          setPrescriptionsError("");
        } else {
          setPrescriptions([]);
          setPrescriptionsError("Unable to load your prescriptions. Please refresh the page or try again later.");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const cancelledAppointment = readCancelledAppointment();
  const upcoming = appointments.filter((a) => {
    const isCancelledByStorage = cancelledAppointment && cancelledAppointment.id === a.id && cancelledAppointment.status === "CANCELLED";
    return !isCancelledByStorage && a.status !== "CANCELLED";
  });
  const nextAppointment = upcoming[0];
  const nextDoctor = nextAppointment?.doctorName || nextAppointment?.doctor?.user?.fullName || nextAppointment?.doctor?.fullName || "Doctor to be assigned";
  const nextDate = nextAppointment?.appointmentDate
    ? new Date(nextAppointment.appointmentDate).toLocaleString()
    : "Date to be confirmed";

  return (
    <>
      <Header
        navLinks={[]}
        user={{ initials, name: displayName, role: "Patient" }}
      />
      <div className="page">
        <div className="page-head">
          <h1>Welcome, {displayName}</h1>
          <p>Here's a quick look at your care.</p>
          <Link className="btn-primary" to="/book" style={{ display: "inline-block", marginTop: 18 }}>
            Book an appointment
          </Link>
        </div>

        <div className="booking-options" aria-label="Appointment types">
          {BOOKING_OPTIONS.map((option) => (
            <Link
              key={option.title}
              className="booking-option-card"
              to="/book"
              state={{ department: option.department, bookingType: option.title }}
            >
              <span className="booking-option-tag">{option.tag}</span>
              <h3>{option.title}</h3>
              <p>{option.description}</p>
              <span className="booking-option-link">Book now</span>
            </Link>
          ))}
        </div>

        <div className="stat-strip">
          <div className="stat">
            <span className="value">{loading ? "…" : upcoming.length}</span>
            <span className="label">Upcoming appointments</span>
          </div>
          <div className="stat">
            <span className="value">{loading ? "…" : appointments.length}</span>
            <span className="label">Total visits</span>
          </div>
        </div>

        <div className="grid-2">
          <div className="appointment-card">
            <div>
              <div className="eyebrow">Next appointment</div>
              {nextAppointment ? (
                <>
                  <h2>{nextDoctor}</h2>
                  <div className="meta">{nextDate}</div>
                  <div className="meta">{nextAppointment.reason || "General consultation"}</div>
                </>
              ) : (
                <>
                  <h2>No appointment scheduled</h2>
                  <div className="meta">Book your next visit when you are ready.</div>
                </>
              )}
            </div>
            <Link className="btn-light" to="/book">Book appointment</Link>
          </div>

          <div className="panel patient-summary">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
              <h2>My profile</h2>
              <Link
                className="profile-edit-link"
                to="/complete-profile"
                state={{ returnTo: `${location.pathname}${location.search}` }}
                aria-label="Edit patient details"
                title="Edit patient details"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
                <span>Edit details</span>
              </Link>
            </div>
            <div className="detail-row"><span>Full name</span><span>{displayName}</span></div>
            <div className="detail-row"><span>Email</span><span>{user?.email || "-"}</span></div>
            <div className="detail-row"><span>Phone</span><span>{profile?.phone || "-"}</span></div>
            <div className="detail-row"><span>Gender</span><span>{profile?.gender || "-"}</span></div>
            <div className="detail-row"><span>Date of birth</span><span>{profile?.dateOfBirth || "-"}</span></div>
            <div className="detail-row"><span>Blood group</span><span>{profile?.bloodGroup || "-"}</span></div>
            <div className="detail-row"><span>Address</span><span>{profile?.address || "-"}</span></div>
            <div className="detail-row"><span>Role</span><span>Patient</span></div>
          </div>
        </div>

        <div className="quick-row">
          <Link className="quick-btn" to="/book">Book an appointment</Link>
          <Link className="quick-btn" to="/portal">View my care</Link>
        </div>

        <div className="table-panel patient-prescriptions-panel">
          <h2>Your Prescriptions</h2>
          {loading ? (
            <p style={{ padding: "0 26px 20px" }}>Loading prescriptions...</p>
          ) : prescriptionsError ? (
            <p style={{ padding: "0 26px 20px" }} role="alert">{prescriptionsError}</p>
          ) : prescriptions.length === 0 ? (
            <p style={{ padding: "0 26px 20px" }}>Your doctor has not shared any prescriptions yet.</p>
          ) : (
            <table>
              <thead>
                <tr><th>Date</th><th>Prescribed by</th><th>Medicine and instructions</th><th>Notes</th><th>Download</th></tr>
              </thead>
              <tbody>
                {prescriptions.map((prescription) => (
                  <tr key={prescription.id}>
                    <td>{prescription.prescribedAt ? new Date(prescription.prescribedAt).toLocaleDateString() : "—"}</td>
                    <td>{prescription.doctorName || "Doctor"}</td>
                    <td>
                      <div className="prescription-patient-medicines">
                        {prescription.medicines?.map((medicine, index) => (
                          <div key={`${prescription.id}-${index}`}>
                            <strong>{medicine.name}</strong>
                            <span>{[medicine.dosage, medicine.frequency, medicine.duration, medicine.instructions].filter(Boolean).join(" · ")}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td>{prescription.notes || "—"}</td>
                    <td>
                      <button
                        type="button"
                        className="record-download"
                        onClick={() => downloadPrescriptionPdf(prescription)}
                      >
                        Download PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="table-panel">
          <h2>Your Appointments</h2>
          {loading ? (
            <p style={{ padding: "0 26px 20px" }}>Loading...</p>
          ) : appointments.length === 0 ? (
            <p style={{ padding: "0 26px 20px" }}>No appointments yet — book one from the Appointments page.</p>
          ) : (
            <table>
              <thead>
                <tr><th>Date</th><th>Reason</th><th>Status</th></tr>
              </thead>
              <tbody>
                {appointments.map((a) => (
                  <tr key={a.id}>
                    <td>{new Date(a.appointmentDate).toLocaleString()}</td>
                    <td>{a.reason || "—"}</td>
                    <td><span className="status-dot">{a.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
      <SiteFooter />
    </>
  );
}