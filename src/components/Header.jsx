import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import Logo from "./Logo.jsx";
import { useAuth } from "../context/AuthContext.jsx";

/**
 * navLinks: [{ label, to }]
 * user: { initials, name, role } — omit for the public/signed-out header
 * cta: { label, to } — shown instead of a user avatar, e.g. "Sign in"
 */
export default function Header({ navLinks = [], user = null, cta = null }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout } = useAuth();

  function handleLogout() {
    logout();
    setMenuOpen(false);
    navigate("/login");
  }

  return (
    <header>
      <Link to="/" className="brand">
        <Logo />
        <span className="brand-text">sanraksha</span>
      </Link>

      <button
        className="menu-toggle"
        aria-label="Toggle menu"
        onClick={() => setMenuOpen((v) => !v)}
      >
        <span></span><span></span><span></span>
      </button>

      <nav style={menuOpen ? { display: "flex", flexDirection: "column", position: "absolute", top: 68, left: 0, right: 0, background: "#fffdfb", padding: "8px 40px", borderBottom: "1px solid var(--line)" } : undefined}>
        {navLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={location.pathname === link.to ? "active" : ""}
            onClick={() => setMenuOpen(false)}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {user && (
        <div className="user-menu">
          <div className="user-avatar">{user.initials}</div>
          <div>
            <div className="user-name">{user.name}</div>
            <div className="user-role">{user.role}</div>
          </div>
          <button type="button" className="header-logout" onClick={handleLogout}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M10 5H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h5" />
              <path d="M14 8l4 4-4 4" />
              <path d="M18 12H9" />
            </svg>
            <span>Logout</span>
          </button>
        </div>
      )}

      {cta && (
        <Link to={cta.to} className="header-cta">
          {cta.label}
        </Link>
      )}
    </header>
  );
}
