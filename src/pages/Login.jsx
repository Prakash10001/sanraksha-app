import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "../components/Header.jsx";
import SiteFooter from "../components/SiteFooter.jsx";
import AuthTabs from "../components/AuthTabs.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await login(email, password);
      if (data.mustResetPassword) navigate("/reset-password?firstLogin=true");
      else if (data.role === "DOCTOR") navigate("/doctor-dashboard");
      else if (data.role === "ADMIN") navigate("/admin-dashboard");
      else navigate("/patient-dashboard");
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "Unable to sign in. Please check your details and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Header navLinks={[]} />

      <div className="auth-page">
        <div className="auth-card-wrapper">
          <div className="auth-card">
            <AuthTabs active="login" />
            <h1>Sign in</h1>
            <p className="auth-sub">Access your patient portal or staff dashboard.</p>

            <form onSubmit={handleSubmit}>
              {error && <div className="auth-error" role="alert">{error}</div>}

              <label>Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />

              <label>Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="password"
              />

              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 18 }}>
                <Link to="/forgot-password" style={{ fontSize: 13, color: "var(--maroon)", fontWeight: 600 }}>
                  Forgot password?
                </Link>
              </div>

              <button type="submit" disabled={loading}>
                {loading ? "Signing in…" : "Sign in"}
              </button>
            </form>
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
