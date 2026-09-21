import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Header from "../components/Header.jsx";
import AppFooter from "../components/AppFooter.jsx";
import axiosClient from "../api/axiosClient.js";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    try {
      await axiosClient.post("/auth/reset-password", {
        token,
        newPassword: password,
      });
      setDone(true);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          "This reset link is invalid or has expired."
      );
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div>
        <Header navLinks={[]} />
        <div className="page centered" style={{ maxWidth: 420 }}>
          <div className="warning-note">
            This reset link is missing or invalid. Please request a new one.
          </div>
          <Link className="btn-primary" to="/forgot-password" style={{ display: "inline-block", marginTop: 16 }}>
            Request a new link
          </Link>
        </div>
        <AppFooter />
      </div>
    );
  }

  return (
    <div>
      <Header navLinks={[]} />

      <div className="page centered" style={{ maxWidth: 420 }}>
        <div className="page-head" style={{ textAlign: "left" }}>
          <Link className="back" to="/login">← Back to sign in</Link>
          <h1>Choose a new password</h1>
          <p>Make sure it's at least 8 characters.</p>
        </div>

        {done ? (
          <div className="panel" style={{ textAlign: "left" }}>
            <p style={{ margin: "0 0 16px", fontSize: 14, color: "var(--ink-soft)" }}>
              Your password has been updated. You can now sign in with your new password.
            </p>
            <button className="btn-primary" onClick={() => navigate("/login")}>
              Go to sign in
            </button>
          </div>
        ) : (
          <form className="panel" style={{ textAlign: "left" }} onSubmit={handleSubmit}>
            {error && <div className="warning-note" role="alert">{error}</div>}

            <label style={labelStyle}>New password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
            />

            <label style={labelStyle}>Confirm new password</label>
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              style={inputStyle}
            />

            <button type="submit" className="btn-primary" style={{ width: "100%" }} disabled={loading}>
              {loading ? "Updating…" : "Update password"}
            </button>
          </form>
        )}
      </div>

      <AppFooter />
    </div>
  );
}

const labelStyle = { display: "block", fontSize: 13, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 6 };
const inputStyle = {
  width: "100%", padding: "11px 14px", border: "1px solid var(--line)",
  borderRadius: 8, fontSize: 14, marginBottom: 16, fontFamily: "inherit",
};
