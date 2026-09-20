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

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axiosClient.get("/admin/stats"),
      axiosClient.get("/admin/today-schedule"),
      axiosClient.get("/admin/recent-patients"),
    ])
      .then(([statsRes, scheduleRes, patientsRes]) => {
        setStats(statsRes.data);
        setSchedule(scheduleRes.data);
        setPatients(patientsRes.data);
      })
      .catch(() => {
        setStats(null);
        setSchedule([]);
        setPatients([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const initials = (user?.fullName || "A D")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div>
      <Header
        navLinks={STAFF_NAV}
        user={{ initials, name: user?.fullName || "Admin", role: "Admin" }}
      />

      <div className="page">
        <div className="page-head">
          <h1>Good morning, {user?.fullName?.split(" ")[0] || "Admin"}</h1>
          <p>Here's what's happening across the hospital today.</p>
        </div>

        {loading ? (
          <p>Loading dashboard...</p>
        ) : (
          <>
            <div className="stat-strip">
              <div className="stat">
                <span className="value">{stats?.totalPatients ?? 0}</span>
                <span className="label">Total patients registered</span>
              </div>
              <div className="stat">
                <span className="value">{stats?.appointmentsToday ?? 0}</span>
                <span className="label">Appointments today</span>
              </div>
              <div className="stat">
                <span className="value">{stats?.totalDoctors ?? 0}</span>
                <span className="label">Doctors available</span>
              </div>
              <div className="stat">
                <span className="value">{stats?.pendingAppointments ?? 0}</span>
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
                <button className="action-btn">Add new patient</button>
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

      <AppFooter />
    </div>
  );
}