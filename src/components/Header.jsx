import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Logo from "./Logo.jsx";

/**
 * navLinks: [{ label, to }]
 * user: { initials, name, role } — omit for the public/signed-out header
 * cta: { label, to } — shown instead of a user avatar, e.g. "Sign in"
 */
export default function Header({ navLinks = [], user = null, cta = null }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

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
        <div className="header-user">
      
          <div className="header-user-info">
            <strong>{user.name}</strong>
            <span>{user.role}</span>
          </div>
      
          <button
            type="button"
            className="header-logout"
            onClick={onLogout}
          >
            Logout
          </button>
      
        </div>
      )}
      
      
      
      
      {user && (
        <div className="header-user">
      
          <div className="header-user-info">
            <strong>{user.name}</strong>
            <span>{user.role}</span>
          </div>
      
          <button
            type="button"
            className="header-logout"
            onClick={onLogout}
          >
            Logout
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
