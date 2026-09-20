import { useNavigate } from "react-router-dom";

// Small tab switcher shown at the top of both Login and Register cards,
// so both options are visible at all times instead of a buried text link.
export default function AuthTabs({ active }) {
  const navigate = useNavigate();

  return (
    <div className="auth-tabs">
      <button
        type="button"
        className={active === "login" ? "auth-tab active" : "auth-tab"}
        onClick={() => navigate("/login")}
      >
        Sign In
      </button>
      <button
        type="button"
        className={active === "register" ? "auth-tab active" : "auth-tab"}
        onClick={() => navigate("/register")}
      >
        Sign Up
      </button>
    </div>
  );
}