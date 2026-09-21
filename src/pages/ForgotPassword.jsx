import { useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header.jsx";
import SiteFooter from "../components/SiteFooter.jsx";
import axiosClient from "../api/axiosClient.js";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const backLink = <Link className="back success-back" to="/login">← Back to sign in</Link>;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await axiosClient.post("/auth/forgot-password", { email });
      // Always show the same success message, whether or not the email
      // exists — this avoids leaking which emails are registered.
      setSubmitted(true);
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Header navLinks={[]} />

      <div className="page centered" style={{ maxWidth: 420 }}>
        <div className="page-head" style={{ textAlign: "left" }}>
          <h1>Reset your password</h1>
          <p>Enter your email and we'll send you a link to reset it.</p>
        </div>

        {submitted ? (
          <div className="panel" style={{ textAlign: "left" }}>
            <div className="status-icon small success" style={{ margin: "0 0 16px" }}>
              <svg width="26" height="26" viewBox="0 0 30 30" aria-hidden="true">
                <path d="M6 15 L12 21 L24 8" fill="none" stroke="#2e6b46" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p style={{ margin: 0, fontSize: 14, color: "var(--ink-soft)" }}>
              If an account exists for <strong>{email}</strong>, a password reset
              link has been sent. Check your inbox (and spam folder).
            </p>
            {backLink}
          </div>
        ) : (
          <form className="panel" style={{ textAlign: "left" }} onSubmit={handleSubmit}>
            {error && <div className="warning-note" role="alert">{error}</div>}
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              style={inputStyle}
            />
            <button type="submit" className="btn-primary" style={{ width: "100%" }} disabled={loading}>
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </form>
        )}
      </div>

      <SiteFooter />
    </div>
  );
}

const labelStyle = { display: "block", fontSize: 13, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 6 };
const inputStyle = {
  width: "100%", padding: "11px 14px", border: "1px solid var(--line)",
  borderRadius: 8, fontSize: 14, marginBottom: 16, fontFamily: "inherit",
};
