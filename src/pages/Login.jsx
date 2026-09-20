import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthTabs from "../components/AuthTabs";
import SiteFooter from "../components/SiteFooter.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await login(email, password);
      if (data.role === "DOCTOR") navigate("/doctor-dashboard");
      else if (data.role === "ADMIN") navigate("/admin-dashboard");
      else navigate("/patient-dashboard");
    } catch (err) {
      setError(err?.response?.data?.error || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card-wrapper">
        <div className="auth-card">
          <AuthTabs active="login" />

          <h1>Sign In</h1>
          <p className="auth-sub">Access your Hospital Management System account</p>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />

            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password"
              required
            />

            <button type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
      <div className="auth-footer">
        <SiteFooter />
      </div>
    </div>
  );
}