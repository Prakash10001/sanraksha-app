import { useEffect, useState } from "react";
import axiosClient from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";
import Header from "../components/Header.jsx";
import SiteFooter from "../components/SiteFooter.jsx";

export default function DoctorDashboard() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  const initials = (user?.fullName || "Doctor")
    .split(" ")
    .map((namePart) => namePart[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    axiosClient
      .get("/appointments/doctor/me")
      .then((res) => setAppointments(res.data))
      .catch(() => setAppointments([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Header
        navLinks={[]}
        user={{ initials, name: user?.fullName || "Doctor", role: "Doctor" }}
      />
      <div className="page">
      <div className="page-head">
        <h1>Welcome, Dr. {user?.fullName || "Doctor"}</h1>
        <p>Here's your patient queue for today.</p>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : appointments.length === 0 ? (
        <p>No appointments scheduled.</p>
      ) : (
        <div className="table-panel">
          <h2>Today's Queue</h2>
          <table>
            <thead>
              <tr><th>Time</th><th>Reason</th><th>Status</th></tr>
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
        </div>
      )}
      </div>
      <SiteFooter />
    </>
  );
}