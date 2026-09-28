import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header.jsx";
import SiteFooter from "../components/SiteFooter.jsx";
import axiosClient from "../api/axiosClient.js";
import { useAuth } from "../context/AuthContext.jsx";

function getDoctorRecord(data) {
  return data?.doctor || data?.profile || data?.data || data || {};
}

function getApiMessage(error, fallback) {
  return error?.response?.data?.message || error?.response?.data?.error || fallback;
}

export default function DoctorProfile() {
  const { user } = useAuth();
  const [form, setForm] = useState({ phone: "", specialization: "", medicalRegistrationNumber: "" });
  const [status, setStatus] = useState("NOT_SUBMITTED");
  const [rejectionReason, setRejectionReason] = useState("");
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    axiosClient.get("/doctors/me/profile")
      .then(({ data }) => {
        const profile = getDoctorRecord(data);
        setForm((current) => ({
          ...current,
          phone: profile.phone || "",
          specialization: profile.specialization || "",
          medicalRegistrationNumber: profile.medicalRegistrationNumber || "",
        }));
        setStatus(String(profile.approvalStatus || profile.status || "PENDING_REVIEW").toUpperCase());
        setRejectionReason(profile.rejectionReason || "");
      })
      .catch((requestError) => {
        if (requestError?.response?.status !== 404) {
          setError(getApiMessage(requestError, "Unable to load your doctor profile."));
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
    if (!document) {
      setError("Please select an identity document to submit for review.");
      return;
    }
    if (document.size > 5 * 1024 * 1024) {
      setError("The document must be 5 MB or smaller.");
      return;
    }

    setSaving(true);
    try {
      const payload = new FormData();
      payload.append("phone", form.phone.trim());
      payload.append("specialization", form.specialization.trim());
      payload.append("medicalRegistrationNumber", form.medicalRegistrationNumber.trim());
      payload.append("identityDocument", document);
      const response = await axiosClient.post("/doctors/me/profile", payload);
      const profile = getDoctorRecord(response.data);
      setStatus(String(profile.approvalStatus || profile.status || "PENDING_REVIEW").toUpperCase());
      setRejectionReason(profile.rejectionReason || "");
      setDocument(null);
    } catch (requestError) {
      setError(getApiMessage(requestError, "Unable to submit your profile for review."));
    } finally {
      setSaving(false);
    }
  }

  const initials = (user?.fullName || "Doctor")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <Header navLinks={[]} user={{ initials, name: user?.fullName || "Doctor", role: "Doctor" }} />
      <main className="profile-page">
        <section className="profile-hero">
          <div className="profile-hero-mark" aria-hidden="true">D</div>
          <div>
            <span className="profile-kicker">DOCTOR VERIFICATION</span>
            <h1>Doctor profile review</h1>
            <p>Submit your contact and professional details for administrator review.</p>
          </div>
          <span className={`approval-badge approval-${status.toLowerCase()}`}>{status.replaceAll("_", " ")}</span>
        </section>

        <section className="profile-form">
          {error && <div className="auth-error" role="alert">{error}</div>}
          {loading ? <p>Loading your profile...</p> : status === "APPROVED" ? (
            <div className="approval-message">
              <h2>Your profile is approved</h2>
              <p>You can now access your doctor dashboard.</p>
              <Link className="btn-primary" to="/doctor-dashboard">Open doctor dashboard</Link>
            </div>
          ) : status === "PENDING_REVIEW" ? (
            <div className="approval-message">
              <h2>Your application is under review</h2>
              <p>An administrator will review your submitted details. Your name will appear to patients after approval.</p>
            </div>
          ) : (
            <>
              {status === "REJECTED" && (
                <div className="approval-rejection" role="status">
                  <strong>Changes requested</strong>
                  <p>{rejectionReason || "Please review your details and submit them again."}</p>
                </div>
              )}
              <p className="verification-intro">Use the name associated with your professional registration. An identity document is visible only to authorized reviewers.</p>
              <form className="verification-form" onSubmit={handleSubmit}>
                <div className="profile-field-grid">
                  <div className="profile-field">
                    <label htmlFor="doctor-phone">Phone number</label>
                    <input id="doctor-phone" name="phone" type="tel" autoComplete="tel" value={form.phone} onChange={handleChange} required />
                  </div>
                  <div className="profile-field">
                    <label htmlFor="doctor-specialization">Specialization</label>
                    <input id="doctor-specialization" name="specialization" value={form.specialization} onChange={handleChange} required />
                  </div>
                  <div className="profile-field">
                    <label htmlFor="doctor-registration-number">Medical registration number</label>
                    <input id="doctor-registration-number" name="medicalRegistrationNumber" value={form.medicalRegistrationNumber} onChange={handleChange} required />
                  </div>
                  <div className="profile-field">
                    <label htmlFor="doctor-identity-document">Identity document</label>
                    <input
                      id="doctor-identity-document"
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                      onChange={(event) => setDocument(event.target.files?.[0] || null)}
                      required
                    />
                    <small>PDF, JPG, or PNG. Maximum 5 MB. Submit Aadhaar only if required by your organization.</small>
                  </div>
                </div>
                <div className="verification-privacy-note">
                  Identity documents contain sensitive information. They should be transmitted and stored securely by the hospital backend, not saved in this browser.
                </div>
                <button className="btn-primary" type="submit" disabled={saving}>
                  {saving ? "Submitting..." : status === "REJECTED" ? "Resubmit for review" : "Submit for review"}
                </button>
              </form>
            </>
          )}
        </section>
      </main>
      <SiteFooter />
    </>
  );
}