import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header.jsx";
import AppFooter from "../components/AppFooter.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const PATIENT_NAV = [
  { label: "My care", to: "/portal" },
  { label: "Appointments", to: "/book" },
  { label: "Records", to: "/records" },
  { label: "Billing", to: "/billing" },
];

const BILLING_ITEMS = [
  { title: "Current invoice", value: "₹1,250", detail: "Consultation and test charges.", accent: "invoice" },
  { title: "Payment history", value: "2 paid", detail: "Latest payments and receipts.", accent: "history" },
  { title: "Insurance", value: "Active", detail: "Coverage provider and policy details.", accent: "insurance" },
  { title: "Receipts", value: "4 downloads", detail: "Print or download past bills.", accent: "receipt" },
];

export default function Billing() {
  const { user } = useAuth();
  const [selectedBilling, setSelectedBilling] = useState(BILLING_ITEMS[0].title);

  const displayName = user?.fullName || user?.name || user?.email || "Patient";
  const initials = displayName
    .split(" ")
    .map((namePart) => namePart[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div>
      <Header navLinks={PATIENT_NAV} user={{ initials, name: displayName, role: "Patient" }} />

      <div className="page">
        <div className="page-head">
          <h1>Billing</h1>
          <p>Review current charges, payment history, insurance, and receipts.</p>
        </div>

        <section className="portal-info-section">
          <div className="portal-section-header">
            <h2>Billing details</h2>
            <button type="button" className="portal-section-link" onClick={() => setSelectedBilling(BILLING_ITEMS[0].title)}>
              View payment history
            </button>
          </div>

          <div className="portal-card-grid">
            {BILLING_ITEMS.map((item) => (
              <button
                key={item.title}
                type="button"
                className={`portal-stat-card ${item.accent} ${selectedBilling === item.title ? "active" : ""}`}
                onClick={() => setSelectedBilling(item.title)}
                aria-pressed={selectedBilling === item.title}
              >
                <span className="portal-card-kicker">{item.title}</span>
                <strong>{item.value}</strong>
                <p>{item.detail}</p>
              </button>
            ))}
          </div>

          <div className="portal-detail-panel">
            <strong>{selectedBilling}</strong>
            <p>
              {selectedBilling === "Current invoice" && "This section shows the latest consultation charges and any pending payment due."}
              {selectedBilling === "Payment history" && "You can review previous payments, successful settlements, and recent billing activity."}
              {selectedBilling === "Insurance" && "Coverage details, policy status, and approved clinic charges are listed here."}
              {selectedBilling === "Receipts" && "Downloadable receipts and payment confirmation documents can be managed from here."}
            </p>
          </div>
        </section>

        <div className="page-head" style={{ marginTop: 24 }}>
          <Link className="btn-primary" to="/portal" style={{ display: "inline-block" }}>Back to my care</Link>
        </div>
      </div>

      <AppFooter />
    </div>
  );
}
