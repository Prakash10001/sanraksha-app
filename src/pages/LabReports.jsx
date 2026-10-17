import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import axiosClient from "../api/axiosClient.js";
import Header from "../components/Header.jsx";
import AppFooter from "../components/AppFooter.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const LAB_STATUSES = ["ORDERED", "SAMPLE_COLLECTED", "PROCESSING", "READY_FOR_REVIEW"];
const LAB_FILTER_STATUSES = [...LAB_STATUSES, "PUBLISHED"];
const REVIEW_STATUSES = new Set(["READY_FOR_REVIEW"]);

function getReportList(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];

  for (const key of ["reports", "labReports", "orders", "items", "content", "results", "data"]) {
    const list = getReportList(payload[key]);
    if (list.length) return list;
  }
  return [];
}

function getPatientList(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];

  for (const key of ["patients", "items", "content", "results", "data"]) {
    const list = getPatientList(payload[key]);
    if (list.length) return list;
  }
  return [];
}

function normalizePatientOption(record) {
  const patient = record.patient || record;
  const user = patient.user || record.user || {};
  const id = record.patientId || record.patient_id || patient.patientId || patient.patient_id || patient.id || record.id;

  if (id == null || id === "") return null;
  return {
    id: String(id),
    code: record.patientCode || patient.patientCode || "",
    name: record.fullName || record.name || patient.fullName || patient.name || user.fullName || "Patient",
    appointments: (record.appointments || patient.appointments || [])
      .filter((appointment) => appointment.appointmentId != null)
      .map((appointment) => ({
        id: String(appointment.appointmentId),
        date: appointment.appointmentDate,
        status: appointment.status,
      })),
  };
}

async function getDoctorPatients() {
  const { data } = await axiosClient.get("/doctors/me/patients");
  const patientsById = new Map();

  for (const record of getPatientList(data)) {
    const patient = normalizePatientOption(record);
    if (!patient) continue;
    const existing = patientsById.get(patient.id);
    if (!existing || (existing.name === "Patient" && patient.name !== "Patient")) {
      patientsById.set(patient.id, patient);
    }
  }

  return [...patientsById.values()].sort((left, right) => left.id.localeCompare(right.id, undefined, { numeric: true }));
}

function reportId(report) {
  return report.id || report.reportId || report.labReportId;
}

function reportStatus(report) {
  return String(report.status || "ORDERED").toUpperCase();
}

function formatDate(value) {
  if (!value) return "Date not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function getApiErrorMessage(error, fallback) {
  const data = error?.response?.data;
  const detail = typeof data === "string"
    ? data.replace(/<[^>]*>/g, " ").trim()
    : data?.message || data?.error || data?.detail || data?.title;

  if (detail) return String(detail).slice(0, 300);

  const status = error?.response?.status;
  return status ? `${fallback} (HTTP ${status})` : fallback;
}

function getPatientDirectoryErrorMessage(error) {
  if (error?.response?.status === 403) {
    return "Your account cannot access the doctor patient list. Sign in with a doctor account to load patients.";
  }
  return getApiErrorMessage(error, "Unable to load your patients.");
}

export default function LabReports() {
  const { user } = useAuth();
  const role = String(user?.role || "").toUpperCase();
  const isDoctor = role === "DOCTOR";
  const displayName = user?.fullName || user?.name || user?.email || (isDoctor ? "Doctor" : "Lab staff");
  const initials = displayName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const [reports, setReports] = useState([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [patients, setPatients] = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [patientsError, setPatientsError] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [patientRefreshKey, setPatientRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [message, setMessage] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [workingId, setWorkingId] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState({});
  const [order, setOrder] = useState({ patientId: "", appointmentId: "", testName: "", priority: "ROUTINE", notes: "" });
  const [ordering, setOrdering] = useState(false);
  const [reviewReport, setReviewReport] = useState(null);
  const [reviewFile, setReviewFile] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const previewRequestId = useRef(0);

  useEffect(() => {
    if (!reviewFile?.url) return undefined;
    return () => URL.revokeObjectURL(reviewFile.url);
  }, [reviewFile]);

  useEffect(() => {
    if (!isDoctor) return undefined;
    let ignore = false;
    setPatientsLoading(true);
    setPatientsError("");

    getDoctorPatients()
      .then((items) => {
        if (!ignore) setPatients(items);
      })
      .catch((error) => {
        if (!ignore) {
          setPatients([]);
          setPatientsError(getPatientDirectoryErrorMessage(error));
        }
      })
      .finally(() => {
        if (!ignore) setPatientsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [isDoctor, patientRefreshKey]);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setLoadError("");

    axiosClient
      .get("/lab-reports")
      .then(({ data }) => {
        if (!ignore) setReports(getReportList(data));
      })
      .catch(() => {
        if (!ignore) setLoadError("Unable to load the lab queue. Check that the lab-report API is available.");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [refreshKey]);

  async function submitOrder(event) {
    event.preventDefault();
    setActionError("");
    setMessage("");
    if (!patients.some((patient) => patient.id === order.patientId)) {
      setActionError("Select a patient from your appointment list before creating the lab order.");
      return;
    }
    const selectedPatient = patients.find((patient) => patient.id === order.patientId);
    if (!selectedPatient?.appointments.some((appointment) => appointment.id === order.appointmentId)) {
      setActionError("Select an appointment associated with this patient before creating the lab order.");
      return;
    }
    setOrdering(true);
    try {
      await axiosClient.post("/lab-reports/orders", {
        patientId: order.patientId.trim(),
        appointmentId: order.appointmentId.trim() || null,
        testName: order.testName.trim(),
        priority: order.priority,
        notes: order.notes.trim(),
      });
      setOrder({ patientId: "", appointmentId: "", testName: "", priority: "ROUTINE", notes: "" });
      setMessage("Lab test order created.");
      setRefreshKey((value) => value + 1);
    } catch (error) {
      setActionError(error?.response?.data?.message || error?.response?.data?.error || "Unable to create the lab order.");
    } finally {
      setOrdering(false);
    }
  }

  async function updateStatus(report, status) {
    const id = reportId(report);
    if (!id || status === reportStatus(report)) return;
    setWorkingId(id);
    setActionError("");
    setMessage("");
    try {
      await axiosClient.patch(`/lab-reports/${id}/status`, { status });
      setMessage("Lab order status updated.");
      setRefreshKey((value) => value + 1);
    } catch (error) {
      setActionError(error?.response?.data?.message || error?.response?.data?.error || "Unable to update this lab order.");
    } finally {
      setWorkingId(null);
    }
  }

  async function uploadResult(report) {
    const id = reportId(report);
    const file = selectedFiles[id];
    if (!id || !file) return;
    const formData = new FormData();
    formData.append("file", file);
    setWorkingId(id);
    setActionError("");
    setMessage("");
    try {
      await axiosClient.post(`/lab-reports/${id}/result`, formData);
      setSelectedFiles((current) => ({ ...current, [id]: null }));
      setMessage("Result uploaded and sent for clinician review.");
      setRefreshKey((value) => value + 1);
    } catch (error) {
      setActionError(error?.response?.data?.message || error?.response?.data?.error || "Unable to upload this result.");
    } finally {
      setWorkingId(null);
    }
  }

  async function openReportReview(report) {
    const id = reportId(report);
    if (!id) {
      setActionError("This report has no ID, so the result cannot be opened. Refresh the lab records and try again.");
      return;
    }

    const requestId = previewRequestId.current + 1;
    previewRequestId.current = requestId;
    setReviewReport(report);
    setReviewFile(null);
    setReviewError("");
    setReviewLoading(true);
    try {
      const response = await axiosClient.get(`/lab-reports/${id}/download`, { responseType: "blob" });
      if (previewRequestId.current !== requestId) return;

      const contentType = response.headers["content-type"] || response.data.type || "application/octet-stream";
      setReviewFile({
        url: URL.createObjectURL(response.data),
        contentType: contentType.split(";")[0].trim().toLowerCase(),
      });
    } catch (error) {
      if (previewRequestId.current === requestId) {
        setReviewError(getApiErrorMessage(error, "Unable to open the uploaded lab result."));
      }
    } finally {
      if (previewRequestId.current === requestId) setReviewLoading(false);
    }
  }

  function closeReportReview() {
    previewRequestId.current += 1;
    setReviewReport(null);
    setReviewFile(null);
    setReviewLoading(false);
    setReviewError("");
  }

  async function publishReport(report) {
    const id = reportId(report);
    if (!id) {
      setActionError("This report has no ID, so the review cannot be submitted. Refresh the lab records and try again.");
      return;
    }
    setWorkingId(id);
    setActionError("");
    setMessage("");
    try {
      await axiosClient.patch(`/lab-reports/${id}/review`, { status: "PUBLISHED" });
      setMessage("Report reviewed and released to the patient.");
      setRefreshKey((value) => value + 1);
      closeReportReview();
    } catch (error) {
      setActionError(getApiErrorMessage(error, "Unable to release this report."));
    } finally {
      setWorkingId(null);
    }
  }

  const navLinks = isDoctor
    ? [{ label: "Dashboard", to: "/doctor-dashboard" }, { label: "Lab reports", to: "/lab-reports" }]
    : role === "ADMIN"
      ? [{ label: "Dashboard", to: "/admin-dashboard" }, { label: "Lab reports", to: "/lab-reports" }]
      : [{ label: "Lab queue", to: "/lab-reports" }];
  const filteredReports = statusFilter === "ALL"
    ? reports
    : reports.filter((report) => reportStatus(report) === statusFilter);

  return (
    <div>
      <Header navLinks={navLinks} user={{ initials, name: displayName, role: isDoctor ? "Doctor" : role === "ADMIN" ? "Admin" : "Lab staff" }} />

      <main className="page lab-workspace">
        <div className="page-head">
          <h1>{isDoctor ? "Lab orders and reviews" : "Laboratory queue"}</h1>
          <p>{isDoctor ? "Order investigations and review results before they are released to patients." : "Track sample processing and upload completed results for clinician review."}</p>
        </div>

        {message && <p className="lab-feedback success" role="status">{message}</p>}
        {actionError && <p className="lab-feedback error" role="alert">{actionError}</p>}

        {isDoctor && (
          <section className="panel lab-order-panel">
            <h2>Order a lab test</h2>
            <form className="lab-order-form" onSubmit={submitOrder}>
              {patientsError && (
                <div className="lab-feedback error lab-patient-error" role="alert">
                  <span>{patientsError}</span>
                  <button type="button" className="portal-section-link" onClick={() => setPatientRefreshKey((value) => value + 1)}>Retry</button>
                </div>
              )}
              <label>
                Filter patients <span className="optional-label">                {patientsLoading ? "Loading your patients..." : `${patients.length} of your patients`}</span>
                <input
                  type="search"
                  value={patientSearch}
                  onChange={(event) => {
                    setPatientSearch(event.target.value);
                    setOrder((current) => ({ ...current, patientId: "", appointmentId: "" }));
                  }}
                  placeholder="Search by patient ID or name"
                  disabled={patientsLoading || patients.length === 0}
                />
              </label>
              <label>
                Patient ID
                <select
                  required
                  value={order.patientId}
                  disabled={patientsLoading || patients.length === 0}
                  onChange={(event) => setOrder((current) => ({ ...current, patientId: event.target.value, appointmentId: "" }))}
                >
                  <option value="" disabled>{patientsLoading ? "Loading patients..." : patients.length ? "Select a patient" : "No patients available"}</option>
                  {patients
                    .filter((patient) => `${patient.id} ${patient.code} ${patient.name}`.toLowerCase().includes(patientSearch.trim().toLowerCase()))
                      .map((patient) => <option key={patient.id} value={patient.id}>{patient.code || patient.id} — {patient.name}</option>)}
                </select>
              </label>
              <label>
                Appointment
                <select
                  required
                  value={order.appointmentId}
                  disabled={!order.patientId || patientsLoading}
                  onChange={(event) => setOrder((current) => ({ ...current, appointmentId: event.target.value }))}
                >
                  <option value="" disabled>Select an appointment</option>
                  {patients.find((patient) => patient.id === order.patientId)?.appointments.map((appointment) => (
                    <option key={appointment.id} value={appointment.id}>
                      Appointment #{appointment.id} — {formatDate(appointment.date)}{appointment.status ? ` (${appointment.status.replaceAll("_", " ")})` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Test name
                <input required value={order.testName} onChange={(event) => setOrder({ ...order, testName: event.target.value })} placeholder="e.g. Complete blood count" />
              </label>
              <label>
                Priority
                <select value={order.priority} onChange={(event) => setOrder({ ...order, priority: event.target.value })}>
                  <option value="ROUTINE">Routine</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </label>
              <label className="lab-notes-field">
                Clinical note <span className="optional-label">Optional</span>
                <textarea rows="3" value={order.notes} onChange={(event) => setOrder({ ...order, notes: event.target.value })} />
              </label>
              <button className="btn-primary" type="submit" disabled={ordering}>{ordering ? "Submitting..." : "Create lab order"}</button>
            </form>
          </section>
        )}

        <section className="panel lab-queue-panel">
          <div className="lab-queue-heading">
            <div>
              <h2>{isDoctor ? "Reports awaiting review" : "Orders and sample status"}</h2>
              <p>
                {filteredReports.length} of {reports.length} {reports.length === 1 ? "record" : "records"}
              </p>
            </div>
            <div className="lab-queue-controls">
              <label className="lab-status-filter">
                Filter by status
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                  <option value="ALL">All statuses</option>
                  {LAB_FILTER_STATUSES.map((status) => (
                    <option key={status} value={status}>{status.replaceAll("_", " ")}</option>
                  ))}
                </select>
              </label>
              <button type="button" className="portal-section-link" onClick={() => setRefreshKey((value) => value + 1)}>Refresh</button>
            </div>
          </div>

          {loading ? <p>Loading lab records...</p> : loadError ? (
            <div><p role="alert">{loadError}</p><button type="button" className="portal-section-link" onClick={() => setRefreshKey((value) => value + 1)}>Try again</button></div>
          ) : reports.length === 0 ? (
            <p>{isDoctor ? "No lab reports are waiting for review." : "No lab orders are in the queue."}</p>
          ) : filteredReports.length === 0 ? (
            <p>No lab records match the selected status.</p>
          ) : (
            <div className="lab-table-wrap">
              <table className="lab-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Test</th>
                    <th>Ordered</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map((report, index) => {
                    const id = reportId(report);
                    const status = reportStatus(report);
                    const patient = report.patientName || report.patient?.fullName || report.patient?.user?.fullName || report.patientId || "Patient";
                    const testName = report.testName || report.name || report.testType || "Lab test";
                    const date = report.orderedAt || report.orderDate || report.createdAt;
                    const busy = workingId === id;

                    return (
                      <tr key={id || `${testName}-${index}`}>
                        <td>{patient}</td>
                        <td>{testName}{report.priority ? <small className="lab-cell-note">{report.priority}</small> : null}</td>
                        <td>{formatDate(date)}</td>
                        <td><span className={`lab-status status-${status.toLowerCase().replaceAll("_", "-")}`}>{status.replaceAll("_", " ")}</span></td>
                        <td className="lab-action-cell">
                          {isDoctor ? (
                            REVIEW_STATUSES.has(status) ? (
                              <button type="button" className="btn-primary" disabled={busy} onClick={() => openReportReview(report)}>{busy ? "Saving..." : "Review report"}</button>
                            ) : <span className="lab-cell-note">Not ready for review</span>
                          ) : (
                            <div className="lab-staff-actions">
                              <select aria-label={`Update status for ${testName}`} value={status} disabled={busy} onChange={(event) => updateStatus(report, event.target.value)}>
                                {!LAB_STATUSES.includes(status) && <option value={status}>{status.replaceAll("_", " ")}</option>}
                                {LAB_STATUSES.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}
                              </select>
                              <input
                                type="file"
                                accept=".pdf,image/png,image/jpeg"
                                aria-label={`Choose result file for ${testName}`}
                                onChange={(event) => setSelectedFiles((current) => ({ ...current, [id]: event.target.files?.[0] || null }))}
                              />
                              <button type="button" className="btn-secondary" disabled={busy || !selectedFiles[id]} onClick={() => uploadResult(report)}>{busy ? "Saving..." : "Upload result"}</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="lab-back-link">
          <Link to={isDoctor ? "/doctor-dashboard" : "/admin-dashboard"}>Back to dashboard</Link>
        </div>
      </main>

      {isDoctor && reviewReport && (
        <div className="modal-backdrop lab-review-backdrop" role="presentation" onClick={closeReportReview}>
          <section className="record-modal lab-review-modal" role="dialog" aria-modal="true" aria-labelledby="lab-review-title" onClick={(event) => event.stopPropagation()}>
            <div className="record-modal-head">
              <div>
                <h2 id="lab-review-title">Review lab report</h2>
                <p>{reviewReport.patientName || reviewReport.patient?.fullName || reviewReport.patientId || "Patient"} · {reviewReport.testName || reviewReport.name || "Lab test"}</p>
              </div>
              <button type="button" className="modal-close" aria-label="Close report preview" onClick={closeReportReview}>×</button>
            </div>
            {reviewLoading ? (
              <div className="lab-review-preview-message">Loading uploaded result...</div>
            ) : reviewError ? (
              <div className="lab-review-preview-message" role="alert">{reviewError}</div>
            ) : reviewFile?.contentType === "application/pdf" ? (
              <iframe className="lab-review-preview" src={reviewFile.url} title={`Lab result for ${reviewReport.testName || "patient"}`} />
            ) : reviewFile?.contentType.startsWith("image/") ? (
              <div className="lab-review-image-wrap">
                <img className="lab-review-image" src={reviewFile.url} alt={`Lab result for ${reviewReport.testName || "patient"}`} />
              </div>
            ) : reviewFile ? (
              <div className="lab-review-preview-message">
                <p>This file type cannot be previewed here. Open or download it to review the result.</p>
                <a className="btn-secondary" href={reviewFile.url} download={`lab-report-${reportId(reviewReport)}`}>Open result file</a>
              </div>
            ) : null}
            <div className="lab-review-actions">
              <button type="button" className="btn-secondary" onClick={closeReportReview}>Close</button>
              <button
                type="button"
                className="btn-primary"
                disabled={reviewLoading || !reviewFile || Boolean(reviewError) || workingId === reportId(reviewReport)}
                onClick={() => publishReport(reviewReport)}
              >
                {workingId === reportId(reviewReport) ? "Publishing..." : "Publish report to patient"}
              </button>
            </div>
          </section>
        </div>
      )}

      <AppFooter />
    </div>
  );
}