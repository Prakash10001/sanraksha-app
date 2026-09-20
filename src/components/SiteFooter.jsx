export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div className="footer-brand">
          <span className="brand-text">sanraksha</span>
          <p>
            A hospital management system built to keep patient care organized,
            connected, and protected — from admission to discharge.
          </p>
        </div>
        <div className="footer-col">
          <h4>Product</h4>
          <a href="#">Dashboard</a>
          <a href="#">Patients</a>
          <a href="#">Appointments</a>
          <a href="#">Billing</a>
        </div>
        <div className="footer-col">
          <h4>Organization</h4>
          <a href="#">Staff directory</a>
          <a href="#">Departments</a>
          <a href="#">Reports</a>
        </div>
        <div className="footer-col">
          <h4>Support</h4>
          <a href="#">Help center</a>
          <a href="#">Contact us</a>
          <a href="#">System status</a>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 Sanraksha. All rights reserved.</span>
        <div>
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
        </div>
      </div>
    </footer>
  );
}
