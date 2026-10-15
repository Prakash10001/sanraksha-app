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

const RECORD_ITEMS = [
  {
    title: "Appointments",
    value: "Loading appointments...",
    detail: "Your booked appointments and visit details.",
    accent: "appointment",
    entries: [],
  },
  {
    title: "Lab reports",
    value: "Loading reports...",
    detail: "Your released lab results and downloadable files.",
    accent: "lab",
    entries: [],
  },
  {
    title: "Prescriptions",
    value: "5 active",
    detail: "Current medicines and dosage guidance.",
    accent: "prescription",
    entries: [
      { label: "Amlodipine", value: "5 mg", meta: "Once daily • Morning" },
      { label: "Vitamin D", value: "60,000 IU", meta: "Weekly • After meal" },
      { label: "Paracetamol", value: "500 mg", meta: "As needed • Not more than 2 tablets/day" },
    ],
  },
  {
    title: "Health summary",
    value: "Updated today",
    detail: "Vitals, allergies, and care overview.",
    accent: "summary",
    entries: [
      { label: "Blood pressure", value: "118/76 mmHg", meta: "Stable" },
      { label: "Allergies", value: "Penicillin", meta: "Documented and monitored" },
      { label: "Medical notes", value: "Improving steadily", meta: "No emergency issues reported" },
    ],
  },
];

export default function Records() {
  const { user } = useAuth();
  const [selectedRecord, setSelectedRecord] = useState(RECORD_ITEMS[0].title);
  const [appointments, setAppointments] = useState([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [appointmentsError, setAppointmentsError] = useState("");
  const [appointmentsRefresh, setAppointmentsRefresh] = useState(0);
  const [labReports, setLabReports] = useState([]);
  const [labReportsLoading, setLabReportsLoading] = useState(true);
  const [labReportsError, setLabReportsError] = useState("");
  const [downloadingReportId, setDownloadingReportId] = useState(null);

  useEffect(() => {
    let ignore = false;

    setAppointmentsLoading(true);
    setAppointmentsError("");
    setLabReportsLoading(true);
    setLabReportsError("");
    axiosClient
      .get("/appointments/me")
      .then((response) => {
        const data = response.data;
        const list = Array.isArray(data) ? data : data.appointments || data.items || data.content || data.data || [];
        if (!ignore) setAppointments(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!ignore) setAppointmentsError("Unable to load appointments. Please try again.");
      })
      .finally(() => {
        if (!ignore) setAppointmentsLoading(false);
      });

    axiosClient
      .get("/lab-reports/me")
      .then((response) => {
        const data = response.data;
        const list = Array.isArray(data) ? data : data.reports || data.labReports || data.items || data.content || data.data || [];
        const releasedReports = Array.isArray(list)
          ? list.filter((report) => ["PUBLISHED", "RELEASED"].includes(String(report.status || "").toUpperCase()))
          : [];
        if (!ignore) setLabReports(releasedReports);
      })
      .catch(() => {
        if (!ignore) setLabReportsError("Unable to load lab reports. Please try again later.");
      })
      .finally(() => {
        if (!ignore) setLabReportsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [appointmentsRefresh]);

  async function downloadReport(report) {
    const reportId = report.id || report.reportId || report.labReportId;
    if (!reportId) return;

    setDownloadingReportId(reportId);
    setLabReportsError("");
    try {
      const response = await axiosClient.get(`/lab-reports/${reportId}/download`, { responseType: "blob" });
      const objectUrl = URL.createObjectURL(response.data);
      const link = document.createElement("a");
      const disposition = response.headers["content-disposition"] || "";
      const fileName = disposition.match(/filename\*?=(?:UTF-8''|\")?([^;\"]+)/i)?.[1] || `lab-report-${reportId}.pdf`;
      link.href = objectUrl;
      link.download = decodeURIComponent(fileName.replace(/\"/g, ""));
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch {
      setLabReportsError("Unable to download this report. Please try again later.");
    } finally {
      setDownloadingReportId(null);
    }
  }

  const appointmentsRecord = {
    ...RECORD_ITEMS[0],
    value: appointmentsLoading
      ? "Loading..."
      : `${appointments.length} ${appointments.length === 1 ? "appointment" : "appointments"}`,
    entries: appointments.map((appointment, index) => {
      const doctor = appointment.doctorName || appointment.doctor?.user?.fullName || appointment.doctor?.fullName || "Doctor to be assigned";
      const department = appointment.department || appointment.doctor?.specialization;
      const date = appointment.appointmentDate || appointment.dateTime || appointment.date || appointment.time;
      const dateLabel = date && !Number.isNaN(new Date(date).getTime())
        ? new Date(date).toLocaleString()
        : date || "Date to be confirmed";
      const status = String(appointment.status || appointment.appointmentStatus || appointment.state || "PENDING").toUpperCase();
      const reason = appointment.reason || appointment.notes;

      return {
        label: appointment.reference || `Appointment ${index + 1}`,
        value: dateLabel,
        meta: [doctor, department, status, reason].filter(Boolean).join(" • "),
      };
    }),
  };
  const labReportsRecord = {
    ...RECORD_ITEMS[1],
    value: labReportsLoading ? "Loading..." : `${labReports.length} ${labReports.length === 1 ? "report" : "reports"}`,
    entries: labReports.map((report, index) => {
      const id = report.id || report.reportId || report.labReportId;
      const testName = report.testName || report.name || report.testType || "Lab report";
      const reportDate = report.resultDate || report.reportDate || report.updatedAt || report.createdAt;
      return {
        id,
        label: testName,
        value: reportDate ? new Date(reportDate).toLocaleDateString() : "Date not provided",
        meta: [report.status || "PUBLISHED", report.orderedByName || report.doctorName || "Care team", report.notes].filter(Boolean).join(" • "),
        key: id || `${testName}-${index}`,
      };
    }),
  };
  const recordItems = [appointmentsRecord, labReportsRecord, ...RECORD_ITEMS.slice(2)];
  const selectedRecordData = recordItems.find((item) => item.title === selectedRecord) ?? recordItems[0];

  const displayName = user?.fullName || user?.name || user?.email || "Patient";
  const initials = displayName
    .split(" ")
    .map((namePart) => namePart[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div>
      <Header navLinks={PATIENT_NAV} user={{ initials, name: displayName, role: "Patient" }} />

      <div className="page">
        <div className="page-head">
          <h1>Medical records</h1>
          <p>View your appointments, reports, prescriptions, and billing overview in one place.</p>
        </div>

        <section className="portal-info-section">
          <div className="portal-section-header">
            <h2>Health records</h2>
            <button type="button" className="portal-section-link" onClick={() => setSelectedRecord(RECORD_ITEMS[0].title)}>
              View details
            </button>
          </div>

          <div className="portal-card-grid">
            {recordItems.map((item) => (
              <button
                key={item.title}
                type="button"
                className={`portal-stat-card ${item.accent} ${selectedRecord === item.title ? "active" : ""}`}
                onClick={() => setSelectedRecord(item.title)}
                aria-pressed={selectedRecord === item.title}
              >
                <span className="portal-card-kicker">{item.title}</span>
                <strong>{item.value}</strong>
                <p>{item.detail}</p>
              </button>
            ))}
          </div>

          <div className="portal-detail-panel">
            <strong>{selectedRecord}</strong>
            <p>
              {selectedRecordData.title === "Appointments" && "Your recent consultation history, scheduled visits, and follow-up dates appear here."}
              {selectedRecordData.title === "Lab reports" && "Only reports reviewed and released by your care team appear here."}
              {selectedRecordData.title === "Prescriptions" && "Current prescriptions, dosage instructions, and refill reminders are visible in one place."}
              {selectedRecordData.title === "Health summary" && "Allergies, vitals, chronic care notes, and personal health updates are kept here."}
            </p>

            <div className="record-list">
              {selectedRecordData.title === "Lab reports" && labReportsLoading ? (
                <p>Loading your released lab reports...</p>
              ) : selectedRecordData.title === "Lab reports" && labReportsError ? (
                <div>
                  <p role="alert">{labReportsError}</p>
                  <button type="button" className="portal-section-link" onClick={() => setAppointmentsRefresh((value) => value + 1)}>Try again</button>
                </div>
              ) : selectedRecordData.title === "Lab reports" && labReports.length === 0 ? (
                <p>No released lab reports are available yet.</p>
              ) : selectedRecordData.title === "Appointments" && appointmentsLoading ? (
                <p>Loading your appointments...</p>
              ) : selectedRecordData.title === "Appointments" && appointmentsError ? (
                <div>
                  <p role="alert">{appointmentsError}</p>
                  <button type="button" className="portal-section-link" onClick={() => setAppointmentsRefresh((value) => value + 1)}>Try again</button>
                </div>
              ) : selectedRecordData.title === "Appointments" && appointments.length === 0 ? (
                <p>No appointments found for your account.</p>
              ) : (
                selectedRecordData.entries.map((entry) => (
                  <div key={`${selectedRecordData.title}-${entry.key || entry.label}`} className="record-item">
                    <span>{entry.label}</span>
                    <strong>{entry.value}</strong>
                    <small>{entry.meta}</small>
                    {selectedRecordData.title === "Lab reports" && entry.id && (
                      <button
                        type="button"
                        className="record-download"
                        disabled={downloadingReportId === entry.id}
                        onClick={() => downloadReport(labReports.find((report) => String(report.id || report.reportId || report.labReportId) === String(entry.id)))}
                      >
                        {downloadingReportId === entry.id ? "Downloading..." : "Download"}
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <div className="page-head" style={{ marginTop: 24 }}>
          <Link className="btn-primary" to="/portal" style={{ display: "inline-block" }}>Back to my care</Link>
        </div>
      </div>

      <AppFooter />
    </div>
  );
}
