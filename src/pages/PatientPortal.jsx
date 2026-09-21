import { Link } from "react-router-dom";
import Header from "../components/Header.jsx";
import AppFooter from "../components/AppFooter.jsx";

const PATIENT_NAV = [
  { label: "My care", to: "/portal" },
  { label: "Appointments", to: "/book" },
  { label: "Records", to: "/portal" },
  { label: "Billing", to: "/portal" },
];

export default function PatientPortal() {
  return (
    <div>
      <Header
        navLinks={PATIENT_NAV}
        user={{ initials: "AS", name: "Anita Sharma", role: "Patient" }}
      />

      <div className="page">
        <div className="page-head">
          <h1>Welcome back, Anita</h1>
          <p>Here's your care at a glance — only your own records, visible to you and your care team.</p>
        </div>

        <div className="appointment-card">
          <div>
            <div className="eyebrow">Your next appointment</div>
            <h2>Cardiology follow-up with Dr. Mehta</h2>
            <div className="meta">Monday, 22 September · 9:00 am · Room 204</div>
          </div>
          <div className="appointment-actions">
            <Link className="btn-outline-light" to="/manage">Reschedule</Link>
            <button className="btn-light">Get directions</button>
          </div>
        </div>

        <div className="quick-row">
          <Link className="quick-btn" to="/book">Book an appointment</Link>
          <button className="quick-btn">Message your doctor</button>
          <button className="quick-btn">Pay a bill</button>
        </div>

        <div className="panel">
          <h2>Your recent records</h2>
          <div className="record-item">
            <div className="record-info">
              <div className="name">Blood test — lipid panel</div>
              <div className="meta">Reviewed by Dr. Mehta · 12 September 2026</div>
            </div>
            <a className="record-link" href="#">View report</a>
          </div>
          <div className="record-item">
            <div className="record-info">
              <div className="name">Prescription — atorvastatin 10mg</div>
              <div className="meta">Issued by Dr. Mehta · 12 September 2026</div>
            </div>
            <a className="record-link" href="#">View details</a>
          </div>
          <div className="record-item">
            <div className="record-info">
              <div className="name">ECG report</div>
              <div className="meta">Reviewed by Dr. Mehta · 28 August 2026</div>
            </div>
            <a className="record-link" href="#">View report</a>
          </div>
        </div>

        <div className="panel">
          <h2>Billing</h2>
          <div className="billing-row">
            <div className="billing-amount">
              <span className="value">₹1,850</span>
              <span className="label">Outstanding balance from your last visit</span>
            </div>
            <button className="btn-light" style={{ background: "var(--maroon)", color: "#fff" }}>Pay now</button>
          </div>
        </div>
      </div>

      <AppFooter />
    </div>
  );
}
