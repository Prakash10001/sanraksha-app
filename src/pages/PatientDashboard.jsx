import { useEffect, useState } from "react";
import axiosClient from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";
import Header from "../components/Header.jsx";
import SiteFooter from "../components/SiteFooter.jsx";

export default function PatientDashboard() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  const initials = (user?.fullName || "Patient")
    .split(" ")
    .map((namePart) => namePart[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    axiosClient
      .get("/appointments/me")
      .then((res) => setAppointments(res.data))
      .catch(() => setAppointments([]))
      .finally(() => setLoading(false));
  }, []);

  const upcoming = appointments.filter((a) => a.status !== "CANCELLED");

  return (
    <>
      <Header
        navLinks={[]}
        user={{ initials, name: user?.fullName || "Patient", role: "Patient" }}
      />
      <div className="page">
      <div className="page-head">
        <h1>Welcome, {user?.fullName || "Patient"}</h1>
        <p>Here's a quick look at your care.</p>
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