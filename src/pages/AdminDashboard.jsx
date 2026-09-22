import { useEffect, useState } from "react";
import axiosClient from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";
import Header from "../components/Header.jsx";
import AppFooter from "../components/AppFooter.jsx";

const STAFF_NAV = [
  { label: "Dashboard", to: "/admin-dashboard" },
  { label: "Patients", to: "/admin-dashboard" },
  { label: "Appointments", to: "/admin-dashboard" },
  { label: "Staff", to: "/admin-dashboard" },
  { label: "Billing", to: "/admin-dashboard" },
];

function getRecordList(data, keys = []) {
  if (Array.isArray(data)) return data;
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [recordType, setRecordType] = useState(null);
  const [viewingRecord, setViewingRecord] = useState(null);
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [patientForm, setPatientForm] = useState({ fullName: "", email: "", password: "", gender: "" });
  const [patientError, setPatientError] = useState("");
  const [patientSaving, setPatientSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentHour, setCurrentHour] = useState(() => new Date().getHours());

  useEffect(() => {
    const clock = setInterval(() => {
      setCurrentHour(new Date().getHours());
    }, 60000);

    return () => clearInterval(clock);
  }, []);

  useEffect(() => {
    Promise.allSettled([
      axiosClient.get("/admin/stats"),
      axiosClient.get("/admin/today-schedule"),
      axiosClient.get("/admin/recent-patients"),
      axiosClient
        .get("/doctors")
        .catch(() => axiosClient.get("/admin/recent-doctors"))
        .catch(() => axiosClient.get("/admin/staff")),
    ])
      .then(([statsResult, scheduleResult, patientsResult, doctorsResult]) => {
        if (statsResult.status === "fulfilled") {
          const statsData = statsResult.value.data;
          setStats(statsData);
          const statsDoctors = getRecordList(statsData, ["doctors", "doctorList", "staff"]);
          if (statsDoctors.length > 0) setDoctors(statsDoctors);
        }
        if (scheduleResult.status === "fulfilled") setSchedule(scheduleResult.value.data);
        if (patientsResult.status === "fulfilled") setPatients(patientsResult.value.data);
        if (doctorsResult.status === "fulfilled") {
          const doctorData = doctorsResult.value.data;
          setDoctors(getRecordList(doctorData, ["doctors", "doctorList", "staff", "users", "items", "content", "data"]));
        }
      })
      .catch(() => {
        setStats(null);
        setSchedule([]);
        setPatients([]);
        setDoctors([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const initials = (user?.fullName || "A D")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const greeting =
    currentHour < 12
      ? "Good morning"
      : currentHour < 18
        ? "Good afternoon"
        : "Good evening";

  const records =
    recordType === "patients"
      ? patients
      : recordType === "doctors"
        ? doctors
        : recordType === "pending"
          ? schedule.filter((item) => item.status !== "CONFIRMED")
          : schedule;

  const recordTitle = {
    patients: "Patient records",
    doctors: "Doctor records",
    appointments: "Today's appointments",
    pending: "Pending confirmations",
  }[recordType];

  function closeRecords() {
    setRecordType(null);
    setViewingRecord(null);
  }

  function handlePatientChange(event) {
    setPatientForm({ ...patientForm, [event.target.name]: event.target.value });
  }

  async function handleAddPatient(event) {
    event.preventDefault();
    setPatientError("");
    setPatientSaving(true);

    try {
      await axiosClient.post("/auth/register", {
        ...patientForm,
        role: "PATIENT",
        mustResetPassword: true,
      });
      const patientsResponse = await axiosClient.get("/admin/recent-patients");
      setPatients(patientsResponse.data);
      setPatientForm({ fullName: "", email: "", password: "", gender: "" });
      setShowAddPatient(false);
    } catch (error) {
      setPatientError(error?.response?.data?.error || "Unable to add patient.");
    } finally {
      setPatientSaving(false);
    }
  }

  return (
    <div>
      <Header
        navLinks={STAFF_NAV}
        user={{ initials, name: user?.fullName || "Admin", role: "Admin" }}
      />

      <div className="page">
        <div className="page-head">
          <h1>{greeting}, {user?.fullName?.split(" ")[0] || "Admin"}</h1>
          <p>Here's what's happening across the hospital today.</p>
        </div>

        {loading ? (
          <p>Loading dashboard...</p>
        ) : (
          <>
            <div className="stat-strip">
              <div className="stat">
                <button className="stat-value-button" type="button" onClick={() => setRecordType("patients")}>
                  <span className="value">{stats?.totalPatients ?? 0}</span>
                </button>
                <span className="label">Total patients registered</span>
              </div>
              <div className="stat">
                <button className="stat-value-button" type="button" onClick={() => setRecordType("appointments")}>
                  <span className="value">{stats?.appointmentsToday ?? 0}</span>
                </button>
                <span className="label">Appointments today</span>
              </div>
              <div className="stat">
                <button className="stat-value-button" type="button" onClick={() => setRecordType("doctors")}>
                  <span className="value">{stats?.totalDoctors ?? 0}</span>
                </button>
                <span className="label">Doctors available</span>
              </div>
              <div className="stat">
                <button className="stat-value-button" type="button" onClick={() => setRecordType("pending")}>
                  <span className="value">{stats?.pendingAppointments ?? 0}</span>
                </button>
                <span className="label">Pending confirmations</span>
              </div>
            </div>

            <div className="grid-2">
              <div className="panel schedule-list">
                <h2>Today's schedule</h2>
                {schedule.length === 0 ? (
                  <p>No appointments scheduled for today.</p>
                ) : (
                  schedule.map((item, idx) => (
                    <div className="schedule-item" key={idx}>
                      <span className="schedule-time">{item.time}</span>
                      <div className="schedule-info">
                        <div className="name">{item.patientName} — {item.specialization}</div>
                        <div className="meta">Dr. {item.doctorName}</div>
                      </div>
                      <span className={`badge ${item.status === "CONFIRMED" ? "badge-confirmed" : "badge-pending"}`}>
                        {item.status === "CONFIRMED" ? "Confirmed" : item.status}
                      </span>
                    </div>
                  ))
                )}
              </div>

              <div className="panel actions-panel">
                <h2>Quick actions</h2>
                <button className="action-btn" type="button" onClick={() => setShowAddPatient(true)}>Add new patient</button>
                <button className="action-btn">Book appointment</button>
                <button className="action-btn">View staff roster</button>
                <button className="action-btn">Generate a bill</button>
              </div>
            </div>

            <div className="table-panel">
              <h2>Recent patients</h2>
              <table>
                <thead>
                  <tr><th>Name</th><th>Patient ID</th><th>Gender</th><th>Registered On</th></tr>
                </thead>
                <tbody>
                  {patients.map((p) => (
                    <tr key={p.patientCode}>
                      <td>{p.name}</td>
                      <td>{p.patientCode}</td>
                      <td>{p.gender || "—"}</td>
                      <td>{p.registeredOn}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {recordType && (
        <div className="modal-backdrop" role="presentation" onClick={closeRecords}>
          <section className="record-modal" role="dialog" aria-modal="true" aria-labelledby="record-modal-title" onClick={(event) => event.stopPropagation()}>
            <div className="record-modal-head">
              <h2 id="record-modal-title">{viewingRecord ? `${recordTitle} details` : recordTitle}</h2>
              <button className="modal-close" type="button" aria-label="Close records" onClick={closeRecords}>×</button>
            </div>
            {viewingRecord ? (
              <div className="record-details">
                {recordType === "patients" && (
                  <>
                    <div className="record-detail-row"><span>Name</span><strong>{viewingRecord.name || viewingRecord.fullName || "-"}</strong></div>
                    <div className="record-detail-row"><span>Patient ID</span><strong>{viewingRecord.patientCode || "-"}</strong></div>
                    <div className="record-detail-row"><span>Gender</span><strong>{viewingRecord.gender || "-"}</strong></div>
                    <div className="record-detail-row"><span>Email</span><strong>{viewingRecord.email || viewingRecord.user?.email || "-"}</strong></div>
                    <div className="record-detail-row"><span>Registered On</span><strong>{viewingRecord.registeredOn || viewingRecord.user?.createdAt || "-"}</strong></div>
                  </>
                )}
                {recordType === "doctors" && (
                  <>
                    <div className="record-detail-row"><span>Name</span><strong>{viewingRecord.user?.fullName || viewingRecord.fullName || viewingRecord.name || "-"}</strong></div>
                    <div className="record-detail-row"><span>Doctor ID</span><strong>{viewingRecord.id || "-"}</strong></div>
                    <div className="record-detail-row"><span>Email</span><strong>{viewingRecord.user?.email || viewingRecord.email || "-"}</strong></div>
                    <div className="record-detail-row"><span>Specialization</span><strong>{viewingRecord.specialization || "-"}</strong></div>
                    <div className="record-detail-row"><span>Department</span><strong>{viewingRecord.department || "-"}</strong></div>
                    <div className="record-detail-row"><span>Availability</span><strong>{viewingRecord.availableFrom && viewingRecord.availableTo ? `${viewingRecord.availableFrom} - ${viewingRecord.availableTo}` : "-"}</strong></div>
                  </>
                )}
                {(recordType === "appointments" || recordType === "pending") && (
                  <>
                    <div className="record-detail-row"><span>Patient</span><strong>{viewingRecord.patientName || viewingRecord.name || "-"}</strong></div>
                    <div className="record-detail-row"><span>Doctor</span><strong>{viewingRecord.doctorName || "-"}</strong></div>
                    <div className="record-detail-row"><span>Date and time</span><strong>{viewingRecord.appointmentDate || viewingRecord.time || "-"}</strong></div>
                    <div className="record-detail-row"><span>Reason</span><strong>{viewingRecord.reason || "-"}</strong></div>
                    <div className="record-detail-row"><span>Status</span><strong>{viewingRecord.status || "-"}</strong></div>
                  </>
                )}
                <button className="btn-secondary record-back" type="button" onClick={() => setViewingRecord(null)}>Back to list</button>
              </div>
            ) : records.length === 0 ? (
              <p>No {recordType} found.</p>
            ) : (
              <div className="record-modal-list">
                {records.map((record, index) => (
                  <div className="record-modal-item" key={record.patientCode || record.doctorCode || record.id || index}>
                    <strong>{record.name || record.fullName || record.patientName || record.doctorName || record.user?.fullName || "Unnamed"}</strong>
                    <span>{record.time || record.patientCode || record.doctorCode || record.email || record.user?.email || `Doctor ID: ${record.id || "-"}`}</span>
                    <span>{record.specialization || record.status || record.gender || record.registeredOn || "-"}</span>
                    <button className="record-view-button" type="button" aria-label={`View details for ${record.name || record.fullName || record.user?.fullName || record.patientName || "record"}`} title="View details" onClick={() => setViewingRecord(record)}>
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="2.5" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {showAddPatient && (
        <div className="modal-backdrop" role="presentation" onClick={() => setShowAddPatient(false)}>
          <section className="record-modal" role="dialog" aria-modal="true" aria-labelledby="add-patient-title" onClick={(event) => event.stopPropagation()}>
            <div className="record-modal-head">
              <h2 id="add-patient-title">Add new patient</h2>
              <button className="modal-close" type="button" aria-label="Close add patient form" onClick={() => setShowAddPatient(false)}>×</button>
            </div>
            {patientError && <div className="auth-error" role="alert">{patientError}</div>}
            <form className="record-form" onSubmit={handleAddPatient}>
              <label htmlFor="patient-full-name">Full name</label>
              <input id="patient-full-name" name="fullName" value={patientForm.fullName} onChange={handlePatientChange} required />

              <label htmlFor="patient-email">Email</label>
              <input id="patient-email" type="email" name="email" value={patientForm.email} onChange={handlePatientChange} required />

              <label htmlFor="patient-password">Temporary password</label>
              <input id="patient-password" type="password" name="password" value={patientForm.password} onChange={handlePatientChange} minLength={6} required />

              <label htmlFor="patient-gender">Gender</label>
              <select id="patient-gender" name="gender" value={patientForm.gender} onChange={handlePatientChange} required>
                <option value="">Select gender</option>
                <option value="FEMALE">Female</option>
                <option value="MALE">Male</option>
                <option value="OTHER">Other</option>
                <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
              </select>

              <button className="confirm-btn" type="submit" disabled={patientSaving}>
                {patientSaving ? "Adding patient..." : "Add patient"}
              </button>
            </form>
          </section>
        </div>
      )}

      <AppFooter />
    </div>
  );
}