import Header from "../components/Header.jsx";
import AppFooter from "../components/AppFooter.jsx";

const ADMIN_NAV = [
  { label: "Dashboard", to: "/admin" },
  { label: "Patients", to: "/admin" },
  { label: "Doctors", to: "/admin" },
  { label: "Appointments", to: "/admin" },
  { label: "Billing", to: "/admin" },
];

const APPOINTMENTS = [
  {
    time: "9:00 am",
    name: "Anita Sharma",
    meta: "Dr. Mehta · Cardiology · Room 204",
    status: "confirmed",
  },
  {
    time: "9:45 am",
    name: "Vikram Rao",
    meta: "Dr. Iyer · Orthopedics · Room 118",
    status: "confirmed",
  },
  {
    time: "10:30 am",
    name: "Meera Das",
    meta: "Dr. Verma · General Medicine · Room 102",
    status: "pending",
  },
  {
    time: "11:15 am",
    name: "Faruk Ahmed",
    meta: "Dr. Nair · Pediatrics · Room 210",
    status: "confirmed",
  },
];

const RECENT_PATIENTS = [
  {
    name: "Anita Sharma",
    id: "PT-10432",
    doctor: "Dr. Mehta",
    dept: "Cardiology",
    status: "Admitted",
    statusClass: "",
    updated: "10 minutes ago",
  },
  {
    name: "Vikram Rao",
    id: "PT-10431",
    doctor: "Dr. Iyer",
    dept: "Orthopedics",
    status: "Under observation",
    statusClass: "observation",
    updated: "42 minutes ago",
  },
  {
    name: "Meera Das",
    id: "PT-10429",
    doctor: "Dr. Verma",
    dept: "General Medicine",
    status: "Admitted",
    statusClass: "",
    updated: "1 hour ago",
  },
  {
    name: "Faruk Ahmed",
    id: "PT-10425",
    doctor: "Dr. Nair",
    dept: "Pediatrics",
    status: "Discharged",
    statusClass: "discharged",
    updated: "3 hours ago",
  },
];

export default function AdminDashboard() {
  return (
    <div>

      {/* ================================
          ADMIN HEADER
          ================================ */}
      <Header
        navLinks={ADMIN_NAV}
        user={{
          initials: "AD",
          name: "Admin",
          role: "Administrator",
        }}
      />

      <div className="page">

        {/* ================================
            PAGE HEADER
            ================================ */}
        <div className="page-head">
          <h1>Admin Dashboard</h1>
          <p>
            Manage hospital operations, staff, patients, appointments, and billing.
          </p>
        </div>

        {/* ================================
            STATISTICS
            ================================ */}
        <div className="stat-strip">

          <div className="stat">
            <span className="value">128</span>
            <span className="label">Total patients</span>
          </div>

          <div className="stat">
            <span className="value">24</span>
            <span className="label">Doctors</span>
          </div>

          <div className="stat">
            <span className="value">42</span>
            <span className="label">Appointments today</span>
          </div>

          <div className="stat">
            <span className="value">12</span>
            <span className="label">Bills pending</span>
          </div>

        </div>

        {/* ================================
            APPOINTMENTS + QUICK ACTIONS
            ================================ */}
        <div className="grid-2">

          {/* Today's appointments */}
          <div className="panel schedule-list">

            <h2>Today's appointments</h2>

            {APPOINTMENTS.map((item) => (
              <div className="schedule-item" key={item.time}>

                <span className="schedule-time">
                  {item.time}
                </span>

                <div className="schedule-info">

                  <div className="name">
                    {item.name}
                  </div>

                  <div className="meta">
                    {item.meta}
                  </div>

                </div>

                <span
                  className={`badge ${
                    item.status === "confirmed"
                      ? "badge-confirmed"
                      : "badge-pending"
                  }`}
                >
                  {item.status === "confirmed"
                    ? "Confirmed"
                    : "Pending"}
                </span>

              </div>
            ))}

          </div>

          {/* Admin quick actions */}
          <div className="panel actions-panel">

            <h2>Admin actions</h2>

            <button className="action-btn">
              Add new doctor
            </button>

            <button className="action-btn">
              Add new patient
            </button>

            <button className="action-btn">
              Manage staff
            </button>

            <button className="action-btn">
              Review pending bills
            </button>

          </div>

        </div>

        {/* ================================
            RECENT PATIENTS
            ================================ */}
        <div className="table-panel">

          <h2>Recent patients</h2>

          <table>

            <thead>
              <tr>
                <th>Name</th>
                <th>Patient ID</th>
                <th>Doctor</th>
                <th>Department</th>
                <th>Status</th>
                <th>Last updated</th>
              </tr>
            </thead>

            <tbody>

              {RECENT_PATIENTS.map((patient) => (

                <tr key={patient.id}>

                  <td>{patient.name}</td>

                  <td>{patient.id}</td>

                  <td>{patient.doctor}</td>

                  <td>{patient.dept}</td>

                  <td>
                    <span
                      className={`status-dot ${patient.statusClass}`}
                    >
                      {patient.status}
                    </span>
                  </td>

                  <td>{patient.updated}</td>

                </tr>

              ))}

            </tbody>

          </table>

        </div>

      </div>

      {/* ================================
          FOOTER
          ================================ */}
      <AppFooter />

    </div>
  );
}