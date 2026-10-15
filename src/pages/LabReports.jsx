import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axiosClient from "../api/axiosClient.js";
import Header from "../components/Header.jsx";
import AppFooter from "../components/AppFooter.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const LAB_STATUSES = ["ORDERED", "SAMPLE_COLLECTED", "PROCESSING", "READY_FOR_REVIEW"];
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

export default function LabReports() {
  const { user } = useAuth();
  const role = String(user?.role || "").toUpperCase();
  const isDoctor = role === "DOCTOR";
  const displayName = user?.fullName || user?.name || user?.email || (isDoctor ? "Doctor" : "Lab staff");
  const initials = displayName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [message, setMessage] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [workingId, setWorkingId] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState({});
  const [order, setOrder] = useState({ patientId: "", appointmentId: "", testName: "", priority: "ROUTINE", notes: "" });
  const [ordering, setOrdering] = useState(false);

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
              <label>
                Patient ID
                <input required value={order.patientId} onChange={(event) => setOrder({ ...order, patientId: event.target.value })} />
              </label>
              <label>
                Appointment ID <span className="optional-label">Optional</span>
                <input value={order.appointmentId} onChange={(event) => setOrder({ ...order, appointmentId: event.target.value })} />
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
              <p>{reports.length} {reports.length === 1 ? "record" : "records"}</p>
            </div>
            <button type="button" className="portal-section-link" onClick={() => setRefreshKey((value) => value + 1)}>Refresh</button>
          </div>

          {loading ? <p>Loading lab records...</p> : loadError ? (
            <div><p role="alert">{loadError}</p><button type="button" className="portal-section-link" onClick={() => setRefreshKey((value) => value + 1)}>Try again</button></div>
          ) : reports.length === 0 ? (
            <p>{isDoctor ? "No lab reports are waiting for review." : "No lab orders are in the queue."}</p>
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
                  {reports.map((report, index) => {
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
                              <button type="button" className="btn-primary" disabled={busy} onClick={() => publishReport(report)}>{busy ? "Saving..." : "Review and release"}</button>
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

      <AppFooter />
    </div>
  );
}