import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header.jsx";
import AppFooter from "../components/AppFooter.jsx";
import axiosClient from "../api/axiosClient.js";
import { useAuth } from "../context/AuthContext.jsx";

const PATIENT_NAV = [
  { label: "My care", to: "/portal" },
  { label: "Appointments", to: "/book" },
  { label: "Records", to: "/records" },
  { label: "Billing", to: "/billing" },
];

function readCancelledAppointment() {
  try {
    const saved = localStorage.getItem("sanraksha_current_appointment");
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function getAppointmentDateParts(value) {
  if (!value) return { day: "--", month: "DATE", full: "Date to be confirmed" };
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return { day: "--", month: "TIME", full: String(value) };
  }
  return {
    day: parsedDate.toLocaleDateString(undefined, { day: "2-digit" }),
    month: parsedDate.toLocaleDateString(undefined, { month: "short" }).toUpperCase(),
    full: parsedDate.toLocaleString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }),
  };
}

function getLabReportList(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];

  for (const key of ["reports", "labReports", "items", "content", "results", "data"]) {
    const reports = getLabReportList(payload[key]);
    if (reports.length) return reports;
  }
  return [];
}

function getReportId(report) {
  return report.id || report.reportId || report.labReportId;
}

function formatReportDate(value) {
  if (!value) return "Date not provided";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
}

export default function PatientPortal() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppointmentIndex, setSelectedAppointmentIndex] = useState(0);
  const [labReports, setLabReports] = useState([]);
  const [labReportsLoading, setLabReportsLoading] = useState(true);
  const [labReportsError, setLabReportsError] = useState("");
  const [labReportsRefresh, setLabReportsRefresh] = useState(0);
  const [downloadingReportId, setDownloadingReportId] = useState(null);

  const displayName = user?.fullName || user?.name || user?.email || "Patient";
  const initials = displayName
    .split(" ")
    .map((namePart) => namePart[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    axiosClient
      .get("/appointments/me")
      .then((response) => {
        const data = response.data;
        setAppointments(Array.isArray(data) ? data : data.appointments || data.items || data.content || data.data || []);
      })
      .catch(() => setAppointments([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let ignore = false;
    setLabReportsLoading(true);
    setLabReportsError("");

    axiosClient
      .get("/lab-reports/me")
      .then(({ data }) => {
        const reports = getLabReportList(data).filter(
          (report) => String(report.status || "").toUpperCase() === "PUBLISHED"
        );
        if (!ignore) setLabReports(reports);
      })
      .catch(() => {
        if (!ignore) {
          setLabReports([]);
          setLabReportsError("Unable to load your released lab reports. Please try again.");
        }
      })
      .finally(() => {
        if (!ignore) setLabReportsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [labReportsRefresh]);

  async function downloadLabReport(report) {
    const reportId = getReportId(report);
    if (!reportId) {
      setLabReportsError("This report cannot be downloaded because it has no report ID.");
      return;
    }

    setDownloadingReportId(reportId);
    setLabReportsError("");
    try {
      const response = await axiosClient.get(`/lab-reports/${reportId}/download`, { responseType: "blob" });
      const objectUrl = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      const disposition = response.headers["content-disposition"] || "";
      const filename = disposition.match(/filename\*?=(?:UTF-8''|\")?([^;\"]+)/i)?.[1]
        || `lab-report-${reportId}.pdf`;
      link.href = objectUrl;
      link.download = decodeURIComponent(filename.replace(/\"/g, ""));
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch {
      setLabReportsError("Unable to download this report. Please try again.");
    } finally {
      setDownloadingReportId(null);
    }
  }

  const cancelledAppointment = readCancelledAppointment();
  const selectedAppointment = appointments[Math.min(selectedAppointmentIndex, Math.max(appointments.length - 1, 0))];
  const dateParts = getAppointmentDateParts(selectedAppointment?.appointmentDate || selectedAppointment?.date || selectedAppointment?.time);
  const doctorName = selectedAppointment?.doctorName || selectedAppointment?.doctor?.user?.fullName || selectedAppointment?.doctor?.fullName || "Doctor to be assigned";
  const isCancelledByStorage = cancelledAppointment && String(cancelledAppointment.id) === String(selectedAppointment?.id) && cancelledAppointment.status === "CANCELLED";
  const appointmentStatus = isCancelledByStorage ? "CANCELLED" : String(selectedAppointment?.status || selectedAppointment?.appointmentStatus || "PENDING").toUpperCase();

  return (
    <div>
      <Header
        navLinks={PATIENT_NAV}
        user={{ initials, name: displayName, role: "Patient" }}
      />

      <div className="page">
        <div className="page-head">
          <h1>Welcome back, {displayName}</h1>
          <p>Here's your care at a glance — only your own records, visible to you and your care team.</p>
        </div>

        <section className="portal-appointment-carousel" aria-label="Your appointments" aria-live="polite">
          <div className="portal-carousel-topline">
            <span>{appointments.length > 0 ? "YOUR APPOINTMENTS" : "YOUR CARE"}</span>
            {appointments.length > 0 && <span className="portal-carousel-count">{selectedAppointmentIndex + 1} <i>/</i> {appointments.length}</span>}
          </div>

          {loading ? (
            <div className="portal-carousel-empty"><h2>Loading your appointments...</h2></div>
          ) : selectedAppointment ? (
            <div className="portal-carousel-content" key={selectedAppointment.id || selectedAppointmentIndex}>
              <div className="portal-date-tile" aria-label={dateParts.full}>
                <span>{dateParts.month}</span>
                <strong>{dateParts.day}</strong>
                <small>VISIT</small>
              </div>
              <div className="portal-appointment-copy">
                <div className={`portal-appointment-status ${appointmentStatus.toLowerCase()}`}>{appointmentStatus}</div>
                <h2>{doctorName}</h2>
                <p className="portal-appointment-date">{dateParts.full}</p>
                <p className="portal-appointment-reason">{selectedAppointment.reason || selectedAppointment.notes || "General consultation"}</p>
                <div className="portal-carousel-actions">
                  <div className="portal-carousel-links">
                    {appointmentStatus !== "CANCELLED" && <Link className="portal-carousel-book" to="/manage">Reschedule</Link>}
                    <Link className="portal-carousel-book" to="/book">Book another appointment</Link>
                  </div>
                  <div className="portal-carousel-controls" aria-label="Appointment navigation">
                    <button type="button" aria-label="Previous appointment" title="Previous appointment" disabled={selectedAppointmentIndex === 0} onClick={() => setSelectedAppointmentIndex((index) => Math.max(index - 1, 0))}>
                      <span aria-hidden="true">‹</span>
                    </button>
                    <button type="button" aria-label="Next appointment" title="Next appointment" disabled={selectedAppointmentIndex >= appointments.length - 1} onClick={() => setSelectedAppointmentIndex((index) => Math.min(index + 1, appointments.length - 1))}>
                      <span aria-hidden="true">›</span>
                    </button>
                  </div>
                </div>
                {appointments.length > 1 && (
                  <div className="portal-carousel-dots" aria-label="Choose an appointment">
                    {appointments.map((appointment, index) => (
                      <button key={appointment.id || index} type="button" aria-label={`Show appointment ${index + 1}`} aria-current={index === selectedAppointmentIndex ? "step" : undefined} className={index === selectedAppointmentIndex ? "active" : ""} onClick={() => setSelectedAppointmentIndex(index)} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="portal-carousel-empty">
              <div className="portal-empty-mark" aria-hidden="true">+</div>
              <div><h2>No appointments yet</h2><p>Your booked visits will appear here.</p></div>
              <Link className="portal-carousel-book" to="/book">Book an appointment</Link>
            </div>
          )}
        </section>

        <div className="quick-row">
          <Link className="quick-btn" to="/book">Book an appointment</Link>
          <Link className="quick-btn" to="/records">View medical records</Link>
          <Link className="quick-btn" to="/billing">Billing overview</Link>
        </div>

        <div className="panel">
          <div className="portal-section-header">
            <h2>Released lab reports</h2>
            <Link className="portal-section-link" to="/records">View all records</Link>
          </div>
          <p>Reports reviewed and published by your care team are available here.</p>
          {labReportsLoading ? (
            <p>Loading your released lab reports...</p>
          ) : labReportsError ? (
            <div>
              <p role="alert">{labReportsError}</p>
              <button type="button" className="portal-section-link" onClick={() => setLabReportsRefresh((value) => value + 1)}>Try again</button>
            </div>
          ) : labReports.length === 0 ? (
            <p>No released lab reports are available yet.</p>
          ) : (
            <div className="record-list">
              {labReports.slice(0, 3).map((report, index) => {
                const reportId = getReportId(report);
                const testName = report.testName || report.name || report.testType || "Lab report";
                const reportDate = report.resultDate || report.orderedAt || report.reportDate;
                return (
                  <div className="record-item" key={reportId || `${testName}-${index}`}>
                    <span>{testName}</span>
                    <strong>{formatReportDate(reportDate)}</strong>
                    <small>{[report.status, report.doctorName].filter(Boolean).join(" • ") || "Published by your care team"}</small>
                    <button
                      type="button"
                      className="record-download"
                      disabled={!reportId || downloadingReportId === reportId}
                      onClick={() => downloadLabReport(report)}
                    >
                      {downloadingReportId === reportId ? "Downloading..." : "Download report"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="panel">
          <h2>Billing</h2>
          <div className="billing-row">
            <div className="billing-amount">
              <span className="value">-</span>
              <span className="label">No billing information available</span>
            </div>
          </div>
        </div>
      </div>

      <AppFooter />
    </div>
  );
}
