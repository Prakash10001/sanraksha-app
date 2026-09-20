import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthTabs from "../components/AuthTabs";
import SiteFooter from "../components/SiteFooter.jsx";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "PATIENT",
    specialization: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await register(form);
      if (data.role === "DOCTOR") navigate("/doctor-dashboard");
      else if (data.role === "ADMIN") navigate("/admin-dashboard");
      else navigate("/patient-dashboard");
    } catch (err) {
      setError(err?.response?.data?.error || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card-wrapper">
      <div className="auth-card">
        <AuthTabs active="register" />

        <h1>Sign Up</h1>
        <p className="auth-sub">Register as a patient, doctor, or admin</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <label>Full Name</label>
          <input name="fullName" value={form.fullName} onChange={handleChange} required />

          <label>Email</label>
          <input type="email" name="email" value={form.email} onChange={handleChange} required />

          <label>Password</label>
          <input type="password" name="password" value={form.password} onChange={handleChange} minLength={6} required />

          <label>Role</label>
          <select name="role" value={form.role} onChange={handleChange}>
            <option value="PATIENT">Patient</option>
            <option value="DOCTOR">Doctor</option>
            <option value="ADMIN">Admin</option>
          </select>

          {form.role === "DOCTOR" && (
            <>
              <label>Specialization</label>
              <input
                name="specialization"
                value={form.specialization}
                onChange={handleChange}
                placeholder="e.g. General Physician"
              />
            </>
          )}

          <button type="submit" disabled={loading}>
            {loading ? "Creating account..." : "Sign Up"}
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