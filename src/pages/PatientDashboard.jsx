import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axiosClient from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";
import Header from "../components/Header.jsx";
import SiteFooter from "../components/SiteFooter.jsx";

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

export default function PatientDashboard() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [profile, setProfile] = useState(null);
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
    ])
      .then(([appointmentsResult, profileResult]) => {
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
              <Link className="profile-edit-link" to="/complete-profile" aria-label="Edit patient details" title="Edit patient details">
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