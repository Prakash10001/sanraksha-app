import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header.jsx";
import AppFooter from "../components/AppFooter.jsx";
import axiosClient from "../api/axiosClient.js";
import { useAuth } from "../context/AuthContext.jsx";
import downloadPrescriptionPdf from "../utils/prescriptionPdf.js";

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
    value: "Loading prescriptions...",
    detail: "Medicines and dosage instructions shared by your doctor.",
    accent: "prescription",
    entries: [],
  },
  {
    title: "Health summary",
    value: "Loading health information...",
    detail: "Patient-reported information and clinician-recorded visit details.",
    accent: "summary",
    entries: [
    ],
  },
];

export default function Records() {
  const { user } = useAuth();
  const [selectedRecord, setSelectedRecord] = useState(RECORD_ITEMS[3].title);
  const [appointments, setAppointments] = useState([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [appointmentsError, setAppointmentsError] = useState("");
  const [appointmentsRefresh, setAppointmentsRefresh] = useState(0);
  const [labReports, setLabReports] = useState([]);
  const [labReportsLoading, setLabReportsLoading] = useState(true);
  const [labReportsError, setLabReportsError] = useState("");
  const [prescriptions, setPrescriptions] = useState([]);
  const [prescriptionsLoading, setPrescriptionsLoading] = useState(true);
  const [prescriptionsError, setPrescriptionsError] = useState("");
  const [downloadingReportId, setDownloadingReportId] = useState(null);
  const [patientProfile, setPatientProfile] = useState(null);
  const [patientProfileLoading, setPatientProfileLoading] = useState(true);
  const [patientProfileError, setPatientProfileError] = useState("");
  const [healthInfo, setHealthInfo] = useState({ reportedAllergies: "", reportedConditions: "", updatedAt: null });
  const [healthInfoLoading, setHealthInfoLoading] = useState(true);
  const [healthInfoError, setHealthInfoError] = useState("");
  const [healthInfoSaving, setHealthInfoSaving] = useState(false);
  const [healthInfoSuccess, setHealthInfoSuccess] = useState("");
  const [healthInfoFormOpen, setHealthInfoFormOpen] = useState(true);
  const [healthInfoForm, setHealthInfoForm] = useState({ reportedAllergies: "", reportedConditions: "" });
  const [medicalRecords, setMedicalRecords] = useState([]);
  const [medicalRecordsLoading, setMedicalRecordsLoading] = useState(true);
  const [medicalRecordsError, setMedicalRecordsError] = useState("");

  useEffect(() => {
    let ignore = false;

    setAppointmentsLoading(true);
    setAppointmentsError("");
    setLabReportsLoading(true);
    setLabReportsError("");
    setPrescriptionsLoading(true);
    setPrescriptionsError("");
    setHealthInfoLoading(true);
    setHealthInfoError("");
    setPatientProfileLoading(true);
    setMedicalRecordsLoading(true);
    setMedicalRecordsError("");
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

    axiosClient
      .get("/prescriptions/me")
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : data.prescriptions || data.items || data.content || data.data || [];
        if (!ignore) setPrescriptions(Array.isArray(list) ? list : []);
      })
      .catch((error) => {
        if (!ignore) {
          setPrescriptionsError(error?.response?.data?.message || "Unable to load prescriptions. Please try again.");
        }
      })
      .finally(() => {
        if (!ignore) setPrescriptionsLoading(false);
      });

    axiosClient
      .get("/patients/me/health-info")
      .then(({ data }) => {
        if (!ignore) {
          const nextHealthInfo = {
            reportedAllergies: data?.reportedAllergies || "",
            reportedConditions: data?.reportedConditions || "",
            updatedAt: data?.updatedAt || null,
          };
          setHealthInfo(nextHealthInfo);
          setHealthInfoForm({
            reportedAllergies: nextHealthInfo.reportedAllergies,
            reportedConditions: nextHealthInfo.reportedConditions,
          });
        }
      })
      .catch((error) => {
        if (!ignore) {
          setHealthInfoError(error?.response?.data?.message || error?.response?.data?.error || "Unable to load your reported health information.");
        }
      })
      .finally(() => {
        if (!ignore) setHealthInfoLoading(false);
      });

    axiosClient
      .get("/patients/me")
      .then(({ data }) => {
        if (!ignore) {
          setPatientProfile(data?.patient || data?.data || data || {});
          setPatientProfileError("");
        }
      })
      .catch((error) => {
        if (!ignore) {
          setPatientProfile(null);
          setPatientProfileError(error?.response?.data?.message || error?.response?.data?.error || "Unable to load your patient profile details.");
        }
      })
      .finally(() => {
        if (!ignore) setPatientProfileLoading(false);
      });

    axiosClient
      .get("/records/me")
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : data?.records || data?.items || data?.content || data?.data || [];
        if (!ignore) setMedicalRecords(Array.isArray(list) ? list : []);
      })
      .catch((error) => {
        if (!ignore) {
          setMedicalRecordsError(error?.response?.data?.message || error?.response?.data?.error || "Unable to load clinician-recorded visit details.");
        }
      })
      .finally(() => {
        if (!ignore) setMedicalRecordsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [appointmentsRefresh]);

  async function saveHealthInfo(event) {
    event.preventDefault();
    setHealthInfoSaving(true);
    setHealthInfoError("");
    setHealthInfoSuccess("");
    try {
      const { data } = await axiosClient.put("/patients/me/health-info", {
        reportedAllergies: healthInfoForm.reportedAllergies.trim() || null,
        reportedConditions: healthInfoForm.reportedConditions.trim() || null,
      });
      const updatedInfo = {
        reportedAllergies: data?.reportedAllergies || "",
        reportedConditions: data?.reportedConditions || "",
        updatedAt: data?.updatedAt || null,
      };
      setHealthInfo(updatedInfo);
      setHealthInfoForm({
        reportedAllergies: updatedInfo.reportedAllergies,
        reportedConditions: updatedInfo.reportedConditions,
      });
      setHealthInfoFormOpen(false);
      setHealthInfoSuccess("Your reported health information has been saved.");
    } catch (error) {
      setHealthInfoError(error?.response?.data?.message || error?.response?.data?.error || "Unable to save your reported health information.");
    } finally {
      setHealthInfoSaving(false);
    }
  }

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
      const appointmentId = appointment.id || appointment.appointmentId || appointment.appointment_id;
      const doctor = appointment.doctorName || appointment.doctor?.user?.fullName || appointment.doctor?.fullName || "Doctor to be assigned";
      const department = appointment.department || appointment.doctor?.specialization;
      const date = appointment.appointmentDate || appointment.dateTime || appointment.date || appointment.time;
      const dateLabel = date && !Number.isNaN(new Date(date).getTime())
        ? new Date(date).toLocaleString()
        : date || "Date to be confirmed";
      const status = String(appointment.status || appointment.appointmentStatus || appointment.state || "PENDING").toUpperCase();
      const reason = appointment.reason || appointment.notes;

      return {
        label: `Appointment ID: ${appointmentId ?? "Unavailable"}`,
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
  const prescriptionsRecord = {
    ...RECORD_ITEMS[2],
    value: prescriptionsLoading ? "Loading..." : `${prescriptions.length} ${prescriptions.length === 1 ? "prescription" : "prescriptions"}`,
    entries: prescriptions.flatMap((prescription, prescriptionIndex) =>
      (prescription.medicines || []).map((medicine, medicineIndex) => ({
        label: medicine.name,
        value: [medicine.dosage, medicine.frequency, medicine.duration].filter(Boolean).join(" · ") || "Instructions not provided",
        meta: [
          prescription.doctorName ? `Prescribed by ${prescription.doctorName}` : "",
          medicine.instructions,
          prescription.notes,
          prescription.prescribedAt && !Number.isNaN(new Date(prescription.prescribedAt).getTime())
            ? new Date(prescription.prescribedAt).toLocaleDateString()
            : "",
        ].filter(Boolean).join(" • "),
        key: `${prescription.id || prescriptionIndex}-${medicineIndex}`,
        prescriptionId: prescription.id,
      }))
    ),
  };
  const healthEntries = [
    {
      label: "Blood group",
      value: patientProfile?.bloodGroup || "Not recorded",
      meta: "From your patient profile",
    },
    {
      label: "Reported allergies",
      value: healthInfo.reportedAllergies || "None reported",
      meta: [
        "Patient-reported; confirm with your care team",
        healthInfo.updatedAt ? `Updated ${new Date(healthInfo.updatedAt).toLocaleString()}` : "",
      ].filter(Boolean).join(" · "),
    },
    {
      label: "Reported conditions",
      value: healthInfo.reportedConditions || "None reported",
      meta: [
        "Patient-reported; not a verified diagnosis",
        healthInfo.updatedAt ? `Updated ${new Date(healthInfo.updatedAt).toLocaleString()}` : "",
      ].filter(Boolean).join(" · "),
    },
    ...medicalRecords.flatMap((record, index) => {
      const visitDate = record.visitDate && !Number.isNaN(new Date(record.visitDate).getTime())
        ? new Date(record.visitDate).toLocaleString()
        : "Date not recorded";
      const details = [
        record.diagnosis,
        record.doctor?.user?.fullName ? `Recorded by ${record.doctor.user.fullName}` : "",
        record.notes,
      ].filter(Boolean).join(" · ");
      const visitMeta = [visitDate, details].filter(Boolean).join(" · ");
      const visitEntries = [];

      if (record.bloodPressureSystolic != null && record.bloodPressureDiastolic != null) {
        visitEntries.push({ label: "Blood pressure", value: `${record.bloodPressureSystolic}/${record.bloodPressureDiastolic} mmHg`, meta: visitMeta });
      }
      if (record.heartRateBpm != null) visitEntries.push({ label: "Heart rate", value: `${record.heartRateBpm} bpm`, meta: visitMeta });
      if (record.temperatureCelsius != null) visitEntries.push({ label: "Temperature", value: `${record.temperatureCelsius} °C`, meta: visitMeta });
      if (record.weightKg != null) visitEntries.push({ label: "Weight", value: `${record.weightKg} kg`, meta: visitMeta });
      if (record.oxygenSaturationPercent != null) visitEntries.push({ label: "Oxygen saturation", value: `${record.oxygenSaturationPercent}%`, meta: visitMeta });
      if (record.diagnosis || record.notes) {
        visitEntries.push({
          label: record.diagnosis || "Visit notes",
          value: record.notes || "No additional notes",
          meta: visitMeta,
        });
      }
      return visitEntries.map((entry, entryIndex) => ({
        ...entry,
        key: `medical-record-${record.id || index}-${entryIndex}`,
      }));
    }),
  ];
  const healthSummaryRecord = {
    ...RECORD_ITEMS[3],
    value: healthInfoLoading || patientProfileLoading || medicalRecordsLoading
      ? "Loading..."
      : `${medicalRecords.length} ${medicalRecords.length === 1 ? "visit record" : "visit records"}`,
    entries: healthEntries,
  };
  const recordItems = [appointmentsRecord, labReportsRecord, prescriptionsRecord, healthSummaryRecord];
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
              {selectedRecordData.title === "Health summary" && "Patient-reported information is shown separately from details recorded by your clinician."}
            </p>

            {selectedRecordData.title === "Health summary" && (
              <div className="health-info-editor">
                <button
                  type="button"
                  className="portal-section-link"
                  onClick={() => {
                    setHealthInfoForm({
                      reportedAllergies: healthInfo.reportedAllergies,
                      reportedConditions: healthInfo.reportedConditions,
                    });
                    setHealthInfoFormOpen((open) => !open);
                    setHealthInfoError("");
                    setHealthInfoSuccess("");
                  }}
                  disabled={healthInfoLoading || healthInfoSaving}
                >
                  {healthInfoFormOpen ? "Hide form" : "Add or update health information"}
                </button>
                <p>These details are self-reported and are not a substitute for clinical assessment. Tell your doctor about any changes.</p>
                {healthInfoError && <p className="form-error" role="alert">{healthInfoError}</p>}
                {healthInfoSuccess && <p className="form-success" role="status">{healthInfoSuccess}</p>}
                {healthInfoFormOpen && (
                  <form className="record-form" onSubmit={saveHealthInfo}>
                    <label htmlFor="reported-allergies">Allergies you want your care team to know about</label>
                    <textarea
                      id="reported-allergies"
                      value={healthInfoForm.reportedAllergies}
                      onChange={(event) => setHealthInfoForm((current) => ({ ...current, reportedAllergies: event.target.value }))}
                      maxLength={4000}
                      rows={3}
                      placeholder="Enter allergies, or leave blank if none are reported"
                      disabled={healthInfoSaving}
                    />
                    <label htmlFor="reported-conditions">Existing conditions you want your care team to know about</label>
                    <textarea
                      id="reported-conditions"
                      value={healthInfoForm.reportedConditions}
                      onChange={(event) => setHealthInfoForm((current) => ({ ...current, reportedConditions: event.target.value }))}
                      maxLength={4000}
                      rows={3}
                      placeholder="Enter existing conditions, or leave blank if none are reported"
                      disabled={healthInfoSaving}
                    />
                    <button className="confirm-btn" type="submit" disabled={healthInfoSaving}>
                      {healthInfoSaving ? "Saving..." : "Save reported information"}
                    </button>
                  </form>
                )}
              </div>
            )}

            <div className="record-list">
              {selectedRecordData.title === "Health summary" && (healthInfoLoading || patientProfileLoading || medicalRecordsLoading) ? (
                <p>Loading your health information...</p>
              ) : selectedRecordData.title === "Health summary" && healthInfoError ? (
                <div>
                  <p role="alert">{healthInfoError}</p>
                  <button type="button" className="portal-section-link" onClick={() => setAppointmentsRefresh((value) => value + 1)}>Try again</button>
                </div>
              ) : selectedRecordData.title === "Health summary" && patientProfileError ? (
                <div>
                  <p role="alert">{patientProfileError}</p>
                  <button type="button" className="portal-section-link" onClick={() => setAppointmentsRefresh((value) => value + 1)}>Try again</button>
                </div>
              ) : selectedRecordData.title === "Health summary" && medicalRecordsLoading ? (
                <p>Loading clinician-recorded visit details...</p>
              ) : selectedRecordData.title === "Health summary" && medicalRecordsError ? (
                <div>
                  <p role="alert">{medicalRecordsError}</p>
                  <button type="button" className="portal-section-link" onClick={() => setAppointmentsRefresh((value) => value + 1)}>Try again</button>
                </div>
              ) : selectedRecordData.title === "Lab reports" && labReportsLoading ? (
                <p>Loading your released lab reports...</p>
              ) : selectedRecordData.title === "Lab reports" && labReportsError ? (
                <div>
                  <p role="alert">{labReportsError}</p>
                  <button type="button" className="portal-section-link" onClick={() => setAppointmentsRefresh((value) => value + 1)}>Try again</button>
                </div>
              ) : selectedRecordData.title === "Prescriptions" && prescriptionsLoading ? (
                <p>Loading your prescriptions...</p>
              ) : selectedRecordData.title === "Prescriptions" && prescriptionsError ? (
                <div>
                  <p role="alert">{prescriptionsError}</p>
                  <button type="button" className="portal-section-link" onClick={() => setAppointmentsRefresh((value) => value + 1)}>Try again</button>
                </div>
              ) : selectedRecordData.title === "Prescriptions" && prescriptions.length === 0 ? (
                <p>No prescriptions have been shared with you yet.</p>
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
                selectedRecordData.entries.map((entry, index) => (
                  <div key={`${selectedRecordData.title}-${entry.key || entry.label}`} className="record-item">
                    <span>{entry.label}</span>
                    <strong>{entry.value}</strong>
                    <small>{entry.meta}</small>
                    {selectedRecordData.title === "Prescriptions"
                      && selectedRecordData.entries.findIndex((item) => item.prescriptionId === entry.prescriptionId) === index
                      && (
                        <button
                          type="button"
                          className="record-download"
                          onClick={() => {
                            const prescription = prescriptions.find((item) => item.id === entry.prescriptionId);
                            if (prescription) downloadPrescriptionPdf(prescription);
                          }}
                        >
                          Download prescription PDF
                        </button>
                      )}
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
