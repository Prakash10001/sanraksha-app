import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import AuthTabs from "../components/AuthTabs";
import SiteFooter from "../components/SiteFooter.jsx";

const roleChoices = [
  { value: "PATIENT", label: "Patient", description: "Manage your care and appointments", icon: "P" },
  { value: "DOCTOR", label: "Doctor", description: "Manage your patient queue", icon: "D" },
  { value: "ADMIN", label: "Admin", description: "Manage the hospital", icon: "A" },
];

const genderChoices = [
  { value: "FEMALE", label: "Female" },
  { value: "MALE", label: "Male" },
  { value: "OTHER", label: "Other" },
  { value: "PREFER_NOT_TO_SAY", label: "Prefer not to say" },
];

export default function Register() {
  const { register, login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "PATIENT",
    gender: "",
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
      await register(form);
      const loggedInData = await login(form.email, form.password);
      if (loggedInData.role === "DOCTOR") navigate("/doctor-dashboard");
      else if (loggedInData.role === "ADMIN") navigate("/admin-dashboard");
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

          <div className="auth-field-heading">
            <label>Choose your role</label>
            <span>What brings you to Sanraksha?</span>
          </div>
          <div className="choice-grid role-grid" role="radiogroup" aria-label="Choose your role">
            {roleChoices.map((choice) => (
              <button
                key={choice.value}
                type="button"
                className={`choice-card ${form.role === choice.value ? "selected" : ""}`}
                aria-pressed={form.role === choice.value}
                onClick={() => setForm({ ...form, role: choice.value, gender: choice.value === "PATIENT" ? form.gender : "" })}
              >
                <span className="choice-icon">{choice.icon}</span>
                <span className="choice-copy">
                  <strong>{choice.label}</strong>
                  <small>{choice.description}</small>
                </span>
                <span className="choice-check" aria-hidden="true">✓</span>
              </button>
            ))}
          </div>

          {form.role === "PATIENT" && (
            <>
              <div className="auth-field-heading gender-heading">
                <label>Gender</label>
                <span>Used to personalize your care records</span>
              </div>
              <div className="choice-grid gender-grid" role="radiogroup" aria-label="Choose your gender">
                {genderChoices.map((choice) => (
                  <button
                    key={choice.value}
                    type="button"
                    className={`choice-pill ${form.gender === choice.value ? "selected" : ""}`}
                    aria-pressed={form.gender === choice.value}
                    onClick={() => setForm({ ...form, gender: choice.value })}
                  >
                    <span className="choice-radio" aria-hidden="true"></span>
                    {choice.label}
                  </button>
                ))}
              </div>
            </>
          )}

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