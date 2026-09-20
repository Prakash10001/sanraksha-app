import Header from "../components/Header.jsx";
import SiteFooter from "../components/SiteFooter.jsx";

const PUBLIC_NAV = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Patients", to: "/dashboard" },
  { label: "Appointments", to: "/book" },
  { label: "Staff", to: "/dashboard" },
  { label: "Billing", to: "/portal" },
];

const FEATURES = [
  {
    title: "Patient records",
    body: "A full history follows every patient from admission to discharge, so no chart, allergy, or prescription is missing when it's needed most.",
  },
  {
    title: "Appointments",
    body: "Doctors, rooms, and equipment are booked against the same calendar, so two departments can't schedule the same slot by accident.",
  },
  {
    title: "Staff & shifts",
    body: "Rosters, leave requests, and on-call coverage stay visible to every department, not locked away in HR spreadsheets.",
  },
  {
    title: "Billing",
    body: "Charges from every department roll up into one bill automatically, so patients and insurers see a single, accurate statement.",
  },
];

export default function Landing() {
  return (
    <div>
      <Header navLinks={PUBLIC_NAV} cta={{ label: "Sign in", to: "/portal" }} />
      <section className="hero">
        <div className="hero-text">
          <h1>Every patient record, every shift, every bill — looked after in one place.</h1>
          <p>
            Sanraksha brings admissions, appointments, staffing, and billing into a
            single system, so nothing about a patient's care falls through the
            cracks between departments.
          </p>
          <div className="hero-actions">
           <a className="btn-primary" href="/dashboard">See a demo</a>
           {/* <a className="btn-secondary" href="/portal">Sign in</a>
             ADD SIGN UP HERE */} 
            <a className="btn-secondary" href="/register"> Register </a>
          </div>
        </div>
      {/*}  <div className="hero-visual">
          <svg viewBox="0 0 460 500" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M230 45 C190 45 150 58 120 75 L120 200 C120 280 165 335 230 360 L230 45 Z" fill="#8a2a2a" />
            <path d="M230 45 C270 45 310 58 340 75 L340 200 C340 280 295 335 230 360 L230 45 Z" fill="#b23a3a" />
            <rect x="212" y="105" width="36" height="180" rx="8" fill="#f6ede4" />
            <rect x="145" y="172" width="170" height="36" rx="8" fill="#f6ede4" />
            <rect x="120" y="68" width="220" height="14" fill="#d4a24c" />
          </svg>
        </div> */}
        <div className="hero-visual">
  <img
    src="/ai-agent-hospital.jpeg"
    alt="Healthcare and hospital"
    className="hero-image"
  />
</div>
      </section>

      <section className="features">
        <h2>Everything one hospital needs, connected</h2>
        <p>Four departments, one shared system — so information entered once doesn't need to be re-entered anywhere else.</p>
        {FEATURES.map((f) => (
          <div className="feature-row" key={f.title}>
            <div className="feature-icon">
              <svg viewBox="0 0 40 46" width="22" height="26" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <rect x="4" y="4" width="32" height="38" rx="4" fill="none" stroke="#8a2a2a" strokeWidth="2" />
                <line x1="12" y1="16" x2="28" y2="16" stroke="#8a2a2a" strokeWidth="2" />
                <line x1="12" y1="24" x2="28" y2="24" stroke="#8a2a2a" strokeWidth="2" />
              </svg>
            </div>
            <div className="feature-body">
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="capabilities">
        <div className="capabilities-grid">
          <div className="capability">
            <h3>Role-based access</h3>
            <p>Every record is visible only to the staff who need it for that patient's care — nothing more.</p>
          </div>
          <div className="capability">
            <h3>One shared calendar</h3>
            <p>Appointments, rooms, and equipment are scheduled from the same source, department to department.</p>
          </div>
          <div className="capability">
            <h3>Built to stay online</h3>
            <p>Designed to keep running through every shift, so care teams are never left without records.</p>
          </div>
        </div>
      </section>

      <section className="cta-band">
        <h2>Ready to bring every department onto one system?</h2>
        <a className="btn-primary" href="/portal">Request a demo</a>
      </section>

      <SiteFooter />
    </div>
  );
}
