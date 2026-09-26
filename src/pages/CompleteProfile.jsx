import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header.jsx";
import SiteFooter from "../components/SiteFooter.jsx";
import axiosClient from "../api/axiosClient.js";
import { useAuth } from "../context/AuthContext.jsx";

const EMPTY_PROFILE = {
  phone: "",
  gender: "",
  dateOfBirth: "",
  bloodGroup: "",
  address: "",
};

function getApiMessage(error, fallback) {
  const responseData = error?.response?.data;
  if (typeof responseData === "string" && responseData.trim()) return responseData;
  if (responseData?.message) return responseData.message;
  if (responseData?.error) return responseData.error;
  if (responseData && typeof responseData === "object") {
    const fieldErrors = Object.entries(responseData)
      .filter(([, value]) => typeof value === "string")
      .map(([field, value]) => `${field}: ${value}`);
    if (fieldErrors.length > 0) return fieldErrors.join(" ");
  }
  return fallback;
}

export default function CompleteProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    axiosClient
      .get("/patients/me")
      .then((response) => {
        const profile = response.data?.patient || response.data?.data || response.data || {};
        setForm((current) => ({ ...current, ...profile }));
      })
      .catch((requestError) => {
        if (requestError?.response?.status !== 404) {
          setError(getApiMessage(requestError, "Unable to load your profile."));
        }
      })
      .finally(() => setLoading(false));
  }, []);

  function handleChange(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSaving(true);

    try {
      const profilePayload = {
        phone: form.phone.trim(),
        gender: form.gender,
        dateOfBirth: form.dateOfBirth,
        bloodGroup: form.bloodGroup,
        address: form.address.trim(),
      };
      await axiosClient.put("/patients/me", profilePayload);
      navigate("/patient-dashboard", { replace: true });
    } catch (requestError) {
      setError(getApiMessage(requestError, "Unable to save your profile."));
    } finally {
      setSaving(false);
    }
  }

  const initials = (user?.fullName || "Patient")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div>
      <Header navLinks={[]} user={{ initials, name: user?.fullName || "Patient", role: "Patient" }} />
      <main className="profile-page">
        <div className="profile-hero">
          <div className="profile-hero-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M20 21a8 8 0 0 0-16 0" /><circle cx="12" cy="7" r="4" /></svg>
          </div>
          <div>
            <span className="profile-kicker">PATIENT PROFILE</span>
            <h1>Keep your care details close</h1>
            <p>A few personal details help your care team prepare for every visit.</p>
          </div>
          <div className="profile-complete-badge"><span></span> Secure account</div>
        </div>

        <form className="profile-form" onSubmit={handleSubmit}>
          {error && <div className="auth-error" role="alert">{error}</div>}
          {loading ? <p>Loading your profile...</p> : (
            <>
              <section className="profile-form-section">
                <div className="profile-section-heading"><span className="profile-section-number">01</span><div><h2>Personal details</h2><p>How your care team can reach and identify you.</p></div></div>
                <div className="profile-field-grid">
                  <div className="profile-field"><label htmlFor="phone">Phone number</label><input id="phone" name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="e.g. 9876543210" required /></div>
                  <div className="profile-field"><label htmlFor="gender">Gender</label><select id="gender" name="gender" value={form.gender} onChange={handleChange} required><option value="">Select gender</option><option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option><option value="PREFER_NOT_TO_SAY">Prefer not to say</option></select></div>
                  <div className="profile-field"><label htmlFor="dateOfBirth">Date of birth</label><input id="dateOfBirth" name="dateOfBirth" type="date" value={form.dateOfBirth || ""} onChange={handleChange} required /></div>
                  <div className="profile-field"><label htmlFor="bloodGroup">Blood group</label><select id="bloodGroup" name="bloodGroup" value={form.bloodGroup} onChange={handleChange} required><option value="">Select blood group</option>{["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((group) => <option key={group} value={group}>{group}</option>)}</select></div>
                </div>
              </section>

              <section className="profile-form-section">
                <div className="profile-section-heading"><span className="profile-section-number">02</span><div><h2>Contact address</h2><p>Where we can reach you when needed.</p></div></div>
                <div className="profile-field"><label htmlFor="address">Address</label><textarea id="address" name="address" rows="4" value={form.address} onChange={handleChange} placeholder="House number, street, city, and postal code" required /></div>
              </section>

              <div className="profile-form-footer"><span>Fields marked as required help keep your record complete.</span><button className="btn-primary" type="submit" disabled={saving}>{saving ? "Saving profile..." : "Save and continue"}<span aria-hidden="true"> →</span></button></div>
            </>
          )}
        </form>
      </main>
      <SiteFooter />
    </div>
  );
}