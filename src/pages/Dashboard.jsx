
import { useEffect, useState } from "react";
import axiosClient from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";
import Header from "../components/Header.jsx";
import SiteFooter from "../components/SiteFooter.jsx";

export default function Dashboard() {
  const { user } = useAuth();

  const initials = (user?.fullName || user?.name || "User")
    .split(" ")
    .map((namePart) => namePart[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosClient
      .get("/appointments/me")
      .then((res) => setAppointments(res.data))
      .catch(() => setAppointments([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="dashboard-page">
      <Header
        navLinks={[]}
        user={{
          initials,
          name: user?.fullName || user?.name || user?.email || "User",
          role: user?.role || "Patient",
        }}
      />
      <main className="dashboard-content">
        <h1>Welcome, {user?.fullName || user?.name || user?.email || "User"}</h1>

        {loading ? (
          <p>Loading...</p>
        ) : appointments.length === 0 ? (
          <p>No appointments yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Reason</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {appointments.map((a) => (
                <tr key={a.id}>
                  <td>
                    {new Date(a.appointmentDate).toLocaleString()}
                  </td>
                  <td>{a.reason || "—"}</td>
                  <td>{a.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
