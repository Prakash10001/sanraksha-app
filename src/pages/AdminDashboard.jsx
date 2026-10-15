import { useEffect, useState } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import axiosClient from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";
import Header from "../components/Header.jsx";
import AppFooter from "../components/AppFooter.jsx";

const DEFAULT_PATIENT_PAGE_SIZE = 5;

const STAFF_NAV = [
  { label: "Dashboard", to: "/admin-dashboard" },
  { label: "Patients", to: "/admin-dashboard" },
  { label: "Appointments", to: "/admin-dashboard" },
  { label: "Lab reports", to: "/lab-reports" },
  { label: "Staff", to: "/admin-dashboard" },
  { label: "Billing", to: "/admin-dashboard" },
];

function getRecordList(data, keys = []) {
  if (Array.isArray(data)) return data;
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

async function getAdminPatientsPage(page, size) {
  const params = { page, size };
  try {
    return await axiosClient.get("/admin/patients", { params });
  } catch {
    return axiosClient.get("/admin/recent-patients", { params });
  }
}

function getPatientPage(data, pageSize) {
  const payload = data?.data && !Array.isArray(data.data) ? { ...data, ...data.data } : data;
  const records = getRecordList(payload, ["patients", "items", "content", "data"]);
  const totalElements = Number(payload?.totalElements ?? payload?.totalCount ?? payload?.totalRecords ?? payload?.total);
  const totalPagesValue = Number(payload?.totalPages ?? payload?.pageCount);
  const hasTotalElements = Number.isFinite(totalElements);
  const hasTotalPages = Number.isFinite(totalPagesValue);

  return {
    records,
    totalElements: hasTotalElements ? totalElements : hasTotalPages ? totalPagesValue * pageSize : null,
    totalPages: hasTotalPages ? totalPagesValue : hasTotalElements ? Math.ceil(totalElements / pageSize) : null,
    hasMetadata: hasTotalElements || hasTotalPages,
  };
}

function patientRecordKey(patient) {
  return String(patient.patientCode || patient.id || patient.email || patient.user?.email || JSON.stringify(patient));
}

function findNestedValue(record, fieldNames) {
  if (!record || typeof record !== "object") return "";
  for (const [key, value] of Object.entries(record)) {
    if (fieldNames.includes(key.toLowerCase()) && value != null && value !== "") return value;
  }
  for (const value of Object.values(record)) {
    if (value && typeof value === "object") {
      const nestedValue = findNestedValue(value, fieldNames);
      if (nestedValue) return nestedValue;
    }
  }
  return "";
}

function normalizePatientRecord(record) {
  const patient = record.patient || record;
  const user = patient.user || record.user || {};
  const profile = patient.profile || record.profile || {};

  return {
    ...record,
    name: record.name || record.fullName || patient.fullName || user.fullName || user.name || "—",
    patientCode: record.patientCode || patient.patientCode || patient.patientId || record.patientId,
    email: findNestedValue(record, ["email", "emailaddress", "patientemail", "emailid"]),
    gender: findNestedValue(record, ["gender", "sex", "patientgender"]),
    registeredOn: record.registeredOn || record.createdAt || patient.createdAt || user.createdAt || "",
  };
}

function formatPatientDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
}

function createHospitalLogoDataUrl() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 500">
    <path d="M230 45 C190 45 150 58 120 75 L120 200 C120 280 165 335 230 360 L230 45 Z" fill="#8a2a2a"/>
    <path d="M230 45 C270 45 310 58 340 75 L340 200 C340 280 295 335 230 360 L230 45 Z" fill="#b23a3a"/>
    <rect x="212" y="105" width="36" height="180" rx="8" fill="#f6ede4"/>
    <rect x="145" y="172" width="170" height="36" rx="8" fill="#f6ede4"/>
    <rect x="120" y="68" width="220" height="14" fill="#d4a24c"/>
  </svg>`;

  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 460;
      canvas.height = 500;
      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Unable to render the hospital logo."));
        return;
      }
      context.drawImage(image, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    image.onerror = () => reject(new Error("Unable to render the hospital logo."));
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [pendingDoctors, setPendingDoctors] = useState([]);
  const [pendingAppointments, setPendingAppointments] = useState([]);
  const [recordType, setRecordType] = useState(null);
  const [viewingRecord, setViewingRecord] = useState(null);
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [showAddDoctor, setShowAddDoctor] = useState(false);
  const [patientForm, setPatientForm] = useState({ fullName: "", email: "", password: "", gender: "" });
  const [doctorForm, setDoctorForm] = useState({ fullName: "", email: "", password: "", specialization: "" });
  const [patientError, setPatientError] = useState("");
  const [doctorError, setDoctorError] = useState("");
  const [patientSaving, setPatientSaving] = useState(false);
  const [doctorSaving, setDoctorSaving] = useState(false);
  const [approvalSavingId, setApprovalSavingId] = useState(null);
  const [approvalError, setApprovalError] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentHour, setCurrentHour] = useState(() => new Date().getHours());
  const [patientsPage, setPatientsPage] = useState(0);
  const [patientPageSize, setPatientPageSize] = useState(DEFAULT_PATIENT_PAGE_SIZE);
  const [patientsAreServerPaged, setPatientsAreServerPaged] = useState(false);
  const [patientPageHasMore, setPatientPageHasMore] = useState(false);
  const [patientTotalElements, setPatientTotalElements] = useState(null);
  const [patientTotalPages, setPatientTotalPages] = useState(null);
  const [patientPageLoading, setPatientPageLoading] = useState(false);
  const [patientPageError, setPatientPageError] = useState("");
  const [patientsPdfBusy, setPatientsPdfBusy] = useState(false);

  useEffect(() => {
    const clock = setInterval(() => {
      setCurrentHour(new Date().getHours());
    }, 60000);

    return () => clearInterval(clock);
  }, []);

  useEffect(() => {
    Promise.allSettled([
      axiosClient.get("/admin/stats"),
      axiosClient.get("/admin/today-schedule"),
      getAdminPatientsPage(0, DEFAULT_PATIENT_PAGE_SIZE),
      axiosClient
        .get("/doctors")
        .catch(() => axiosClient.get("/admin/recent-doctors"))
        .catch(() => axiosClient.get("/admin/staff")),
      axiosClient.get("/admin/doctors", { params: { status: "PENDING_REVIEW" } }),
    ])
      .then(([statsResult, scheduleResult, patientsResult, doctorsResult, pendingDoctorsResult]) => {
        if (statsResult.status === "fulfilled") {
          const statsData = statsResult.value.data;
          setStats(statsData);
          const statsDoctors = getRecordList(statsData, ["doctors", "doctorList", "staff"]);
          if (statsDoctors.length > 0) setDoctors(statsDoctors);
        }
        if (scheduleResult.status === "fulfilled") {
          setSchedule(getRecordList(scheduleResult.value.data, ["appointments", "schedule", "items", "content", "data"]));
        }
        if (patientsResult.status === "fulfilled") {
          const patientPageData = getPatientPage(patientsResult.value.data, DEFAULT_PATIENT_PAGE_SIZE);
          const statsPatientTotal = Number(statsResult.status === "fulfilled" ? statsResult.value.data?.totalPatients : NaN);
          const patientTotal = patientPageData.totalElements ?? (Number.isFinite(statsPatientTotal) ? statsPatientTotal : null);
          const totalPages = patientPageData.totalPages ?? (patientTotal == null ? null : Math.ceil(patientTotal / DEFAULT_PATIENT_PAGE_SIZE));
          const serverPaged = patientPageData.records.length <= DEFAULT_PATIENT_PAGE_SIZE
            && ((patientTotal != null && patientTotal > patientPageData.records.length) || (totalPages != null && totalPages > 1));
          setPatients(patientPageData.records.map(normalizePatientRecord));
          setPatientsAreServerPaged(serverPaged);
          setPatientTotalElements(patientTotal);
          setPatientTotalPages(totalPages);
          setPatientPageHasMore(serverPaged && (totalPages != null
            ? totalPages > 1
            : patientPageData.records.length === DEFAULT_PATIENT_PAGE_SIZE));
        }
        if (doctorsResult.status === "fulfilled") {
          const doctorData = doctorsResult.value.data;
          setDoctors(getRecordList(doctorData, ["doctors", "doctorList", "staff", "users", "items", "content", "data"]));
        }
        if (pendingDoctorsResult.status === "fulfilled") {
          setPendingDoctors(getRecordList(pendingDoctorsResult.value.data, ["doctors", "pendingDoctors", "doctorList", "items", "content", "data"]));
        }
      })
      .catch(() => {
        setStats(null);
        setSchedule([]);
        setPatients([]);
        setDoctors([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const initials = (user?.fullName || "A D")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const greeting =
    currentHour < 12
      ? "Good morning"
      : currentHour < 18
        ? "Good afternoon"
        : "Good evening";

  const approvedDoctors = doctors.filter(
    (doctor) => String(doctor.approvalStatus || doctor.status || "").toUpperCase() === "APPROVED"
  );
  const patientPageCount = Math.max(1, patientsAreServerPaged
    ? patientTotalPages || (patientPageHasMore ? patientsPage + 2 : patientsPage + 1)
    : Math.ceil(patients.length / patientPageSize));
  const patientPageStart = patientsPage * patientPageSize;
  const visiblePatients = patientsAreServerPaged ? patients : patients.slice(patientPageStart, patientPageStart + patientPageSize);
  const canGoToNextPatientPage = patientsAreServerPaged
    ? patientTotalPages != null ? patientsPage + 1 < patientTotalPages : patientPageHasMore
    : patientsPage + 1 < patientPageCount;

  const records =
    recordType === "patients"
      ? patients
      : recordType === "doctors"
        ? approvedDoctors
        : recordType === "doctor-approvals"
          ? pendingDoctors
        : recordType === "pending"
          ? (pendingAppointments.length > 0 ? pendingAppointments : schedule).filter((item) => {
              const status = String(item.status || item.appointmentStatus || item.state || "").toUpperCase();
              return status !== "CONFIRMED" && status !== "CANCELLED" && status !== "COMPLETED";
            })
          : schedule;

  const recordTitle = {
    patients: "Patient records",
    doctors: "Doctor records",
    "doctor-approvals": "Doctor applications awaiting review",
    appointments: "Today's appointments",
    pending: "Pending confirmations",
  }[recordType];

  function closeRecords() {
    setRecordType(null);
    setViewingRecord(null);
    setApprovalError("");
    setRejectionReason("");
  }

  async function openDoctorApprovalRecords() {
    setRecordType("doctor-approvals");
    setViewingRecord(null);
    setApprovalError("");
    try {
      const response = await axiosClient.get("/admin/doctors", { params: { status: "PENDING_REVIEW" } });
      setPendingDoctors(getRecordList(response.data, ["doctors", "pendingDoctors", "doctorList", "items", "content", "data"]));
    } catch (error) {
      setPendingDoctors([]);
      setApprovalError(error?.response?.data?.message || error?.response?.data?.error || "Unable to load doctor applications.");
    }
  }

  async function sendDoctorNotification(doctor, status, reason) {
    const doctorId = doctor.id || doctor.doctorId || doctor.userId || doctor._id;
    const email = doctor.email || doctor.user?.email || doctor.userEmail || "";
    const fullName = doctor.fullName || doctor.name || doctor.user?.fullName || doctor.user?.name || "";
    const message = status === "APPROVED"
      ? "Your doctor registration has been approved. You can now access the doctor dashboard."
      : `Your doctor registration was rejected${reason ? `: ${reason}` : "."} Please update the missing details and submit again.`;

    const payload = {
      doctorId,
      email,
      fullName,
      status,
      rejectionReason: reason || "",
      message,
    };

    const endpoints = [
      `/admin/doctors/${doctorId}/notify`,
      `/admin/doctors/${doctorId}/notification`,
      "/admin/doctor-approval-notify",
      "/notifications/doctor-status",
    ];

    for (const endpoint of endpoints) {
      try {
        await axiosClient.post(endpoint, payload);
        return true;
      } catch {
        // The email service may not exist in this frontend-only project, so continue to the next route.
      }
    }

    return false;
  }

  async function handleDoctorApproval(doctor, status) {
    const doctorId = doctor.id || doctor.doctorId;
    if (!doctorId) {
      setApprovalError("The doctor record is missing its ID.");
      return;
    }
    if (status === "REJECTED" && !rejectionReason.trim()) {
      setApprovalError("Add a reason before rejecting this application.");
      return;
    }

    setApprovalSavingId(String(doctorId));
    setApprovalError("");
    try {
      await axiosClient.patch(`/admin/doctors/${doctorId}/approval`, {
        status,
        rejectionReason: status === "REJECTED" ? rejectionReason.trim() : null,
      });
      await sendDoctorNotification(
        doctor,
        status,
        status === "REJECTED" ? rejectionReason.trim() : ""
      );
      setPendingDoctors((current) => current.filter((item) => String(item.id || item.doctorId) !== String(doctorId)));
      setViewingRecord(null);
      setRejectionReason("");
    } catch (error) {
      setApprovalError(error?.response?.data?.message || error?.response?.data?.error || "Unable to update doctor approval.");
    } finally {
      setApprovalSavingId(null);
    }
  }

  async function openPendingRecords() {
    setRecordType("pending");
    const endpoints = ["/admin/pending-appointments", "/admin/appointments", "/appointments"];

    for (const endpoint of endpoints) {
      try {
        const response = await axiosClient.get(endpoint);
        const appointmentList = getRecordList(response.data, ["appointments", "pendingAppointments", "items", "content", "data"]);
        const pendingList = appointmentList.filter((item) => {
          const status = String(item.status || item.appointmentStatus || item.state || "").toUpperCase();
          return status !== "CONFIRMED" && status !== "CANCELLED" && status !== "COMPLETED";
        });

        if (pendingList.length > 0) {
          setPendingAppointments(pendingList);
          return;
        }
      } catch {
        // Try the next admin appointment route.
      }
    }

    setPendingAppointments([]);
  }

  function handlePatientChange(event) {
    setPatientForm({ ...patientForm, [event.target.name]: event.target.value });
  }

  function handleDoctorChange(event) {
    setDoctorForm({ ...doctorForm, [event.target.name]: event.target.value });
  }

  async function handleAddPatient(event) {
    event.preventDefault();
    setPatientError("");
    setPatientSaving(true);

    try {
      await axiosClient.post("/auth/register", {
        ...patientForm,
        role: "PATIENT",
        userRole: "PATIENT",
        accountRole: "PATIENT",
        mustResetPassword: true,
      });
      const patientsResponse = await getAdminPatientsPage(0, patientPageSize);
      const patientPageData = getPatientPage(patientsResponse.data, patientPageSize);
      setPatients(patientPageData.records.map(normalizePatientRecord));
      setPatientsPage(0);
      setPatientTotalElements(patientPageData.totalElements ?? null);
      setPatientTotalPages(patientPageData.totalPages ?? null);
      setPatientForm({ fullName: "", email: "", password: "", gender: "" });
      setShowAddPatient(false);
    } catch (error) {
      setPatientError(error?.response?.data?.error || "Unable to add patient.");
    } finally {
      setPatientSaving(false);
    }
  }

  async function handleAddDoctor(event) {
    event.preventDefault();
    setDoctorError("");
    setDoctorSaving(true);

    try {
      await axiosClient.post("/auth/register", {
        ...doctorForm,
        role: "DOCTOR",
        userRole: "DOCTOR",
        accountRole: "DOCTOR",
        mustResetPassword: true,
      });

      const doctorsResponse = await axiosClient.get("/doctors").catch(() => axiosClient.get("/admin/recent-doctors")).catch(() => axiosClient.get("/admin/staff"));
      const doctorData = doctorsResponse.data;
      setDoctors(getRecordList(doctorData, ["doctors", "doctorList", "staff", "users", "items", "content", "data"]));

      const statsResponse = await axiosClient.get("/admin/stats").catch(() => null);
      if (statsResponse?.data) {
        setStats(statsResponse.data);
      }

      setDoctorForm({ fullName: "", email: "", password: "", specialization: "" });
      setShowAddDoctor(false);
    } catch (error) {
      setDoctorError(error?.response?.data?.error || "Unable to add doctor.");
    } finally {
      setDoctorSaving(false);
    }
  }

  async function changePatientPage(nextPage, requestedPageSize = patientPageSize) {
    if (!patientsAreServerPaged) {
      setPatientsPage(nextPage);
      return;
    }

    setPatientPageLoading(true);
    setPatientPageError("");
    try {
      const response = await getAdminPatientsPage(nextPage, requestedPageSize);
      const pageData = getPatientPage(response.data, requestedPageSize);
      const total = pageData.totalElements ?? patientTotalElements;
      const totalPages = pageData.totalPages ?? (total == null ? null : Math.ceil(total / requestedPageSize));
      const samePage = nextPage > patientsPage
        && pageData.records.length === patients.length
        && pageData.records.every((patient, index) => patientRecordKey(patient) === patientRecordKey(patients[index]));

      if (pageData.records.length === 0 || samePage && pageData.records.length <= requestedPageSize) {
        setPatientPageHasMore(false);
        setPatientPageError("The patient API returned the same records. The backend must return all patients or support page and size parameters.");
        return;
      }

      const serverPaged = pageData.records.length <= requestedPageSize
        && ((total != null && total > pageData.records.length) || (totalPages != null && totalPages > 1));
      setPatients(pageData.records.map(normalizePatientRecord));
      setPatientsPage(nextPage);
      setPatientsAreServerPaged(serverPaged);
      setPatientTotalElements(total);
      setPatientTotalPages(totalPages);
      setPatientPageHasMore(serverPaged && (totalPages != null
        ? nextPage + 1 < totalPages
        : pageData.records.length === requestedPageSize));
    } catch (error) {
      setPatientPageError(error?.response?.data?.message || "Unable to load the next patient page.");
    } finally {
      setPatientPageLoading(false);
    }
  }

  function handlePatientPageSizeChange(event) {
    const nextSize = Number(event.target.value);
    setPatientPageSize(nextSize);
    setPatientsPage(0);
    if (patientsAreServerPaged) changePatientPage(0, nextSize);
  }

  async function getAllPatientsForPdf() {
    if (!patientsAreServerPaged) return patients;

    const allPatients = [];
    const seenPages = new Set();
    const maxPages = patientTotalPages || 1000;

    for (let page = 0; page < maxPages; page += 1) {
      const response = await getAdminPatientsPage(page, patientPageSize);
      const pageData = getPatientPage(response.data, patientPageSize);
      const pageKey = pageData.records.map(patientRecordKey).join("|");
      if (!pageData.records.length || seenPages.has(pageKey)) break;
      seenPages.add(pageKey);
      allPatients.push(...pageData.records);
      if (pageData.totalPages != null && page + 1 >= pageData.totalPages) break;
      if (pageData.totalPages == null && pageData.records.length < patientPageSize) break;
    }

    return allPatients.map(normalizePatientRecord);
  }

  async function downloadPatientsPdf() {
    if (patients.length === 0) return;

    setPatientsPdfBusy(true);
    try {
      const patientsForPdf = await getAllPatientsForPdf();
      const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const logo = await createHospitalLogoDataUrl();
      const generatedAt = new Date().toLocaleString();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      autoTable(pdf, {
        startY: 51,
        margin: { top: 51, right: 14, bottom: 20, left: 14 },
        head: [["Name", "Doctor", "Patient ID", "Gender", "Registered On"]],
        body: patientsForPdf.map((patient) => [
          patient.name || patient.fullName || patient.user?.fullName || "—",
          patient.doctorName || patient.doctor?.fullName || patient.doctor?.user?.fullName || patient.assignedDoctor || "—",
          patient.patientCode || patient.id || "—",
          patient.gender || "—",
          formatPatientDate(patient.registeredOn || patient.createdAt),
        ]),
        theme: "grid",
        styles: { font: "helvetica", fontSize: 9, cellPadding: 4, lineColor: [226, 218, 211], lineWidth: 0.2, textColor: [54, 44, 42] },
        headStyles: { fillColor: [138, 42, 42], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 9 },
        alternateRowStyles: { fillColor: [250, 247, 244] },
        columnStyles: { 2: { cellWidth: 32 }, 3: { cellWidth: 30 }, 4: { cellWidth: 40 } },
        didDrawPage: ({ pageNumber }) => {
          pdf.addImage(logo, "PNG", 14, 10, 15, 17);
          pdf.setTextColor(138, 42, 42);
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(16);
          pdf.text("SANRAKSHA", 34, 17);
          pdf.setTextColor(105, 91, 84);
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(8);
          pdf.text("HOSPITAL MANAGEMENT SYSTEM", 34, 23);
          pdf.setDrawColor(212, 162, 76);
          pdf.setLineWidth(0.7);
          pdf.line(14, 32, pageWidth - 14, 32);
          pdf.setTextColor(44, 37, 35);
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(11);
          pdf.text("RECENT PATIENT RECORDS", 14, 40);
          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(8);
          pdf.setTextColor(105, 91, 84);
          pdf.text(`${patientsForPdf.length} records  |  Generated ${generatedAt}`, 14, 46);
          pdf.setDrawColor(226, 218, 211);
          pdf.setLineWidth(0.3);
          pdf.line(14, pageHeight - 15, pageWidth - 14, pageHeight - 15);
          pdf.setFontSize(7);
          pdf.text("CONFIDENTIAL - Authorized hospital use only", 14, pageHeight - 9);
          pdf.text(`Page ${pageNumber}`, pageWidth - 14, pageHeight - 9, { align: "right" });
        },
      });

      pdf.save("sanraksha-recent-patients.pdf");
    } finally {
      setPatientsPdfBusy(false);
    }
  }

  return (
    <div>
      <Header
        navLinks={STAFF_NAV}
        user={{ initials, name: user?.fullName || "Admin", role: "Admin" }}
      />

      <div className="page">
        <div className="page-head">
          <h1>{greeting}, {user?.fullName?.split(" ")[0] || "Admin"}</h1>
          <p>Here's what's happening across the hospital today.</p>
        </div>

        {loading ? (
          <p>Loading dashboard...</p>
        ) : (
          <>
            <div className="stat-strip">
              <div className="stat">
                <button className="stat-value-button" type="button" onClick={() => setRecordType("patients")}>
                  <span className="value">{stats?.totalPatients ?? 0}</span>
                </button>
                <span className="label">Total patients registered</span>
              </div>
              <div className="stat">
                <button className="stat-value-button" type="button" onClick={() => setRecordType("appointments")}>
                  <span className="value">{stats?.appointmentsToday ?? 0}</span>
                </button>
                <span className="label">Appointments today</span>
              </div>
              <div className="stat">
                <button className="stat-value-button" type="button" onClick={() => setRecordType("doctors")}>
                  <span className="value">{approvedDoctors.length}</span>
                </button>
                <span className="label">Doctors available</span>
              </div>
              <div className="stat">
                <button className="stat-value-button" type="button" onClick={openPendingRecords}>
                  <span className="value">{stats?.pendingAppointments ?? 0}</span>
                </button>
                <span className="label">Pending confirmations</span>
              </div>
            </div>

            <div className="grid-2">
              <div className="panel schedule-list">
                <h2>Today's schedule</h2>
                {schedule.length === 0 ? (
                  <p>No appointments scheduled for today.</p>
                ) : (
                  schedule.map((item, idx) => (
                    <div className="schedule-item" key={idx}>
                      <span className="schedule-time">{item.time}</span>
                      <div className="schedule-info">
                        <div className="name">{item.patientName} — {item.specialization}</div>
                        <div className="meta">Dr. {item.doctorName}</div>
                      </div>
                      <span className={`badge ${item.status === "CONFIRMED" ? "badge-confirmed" : "badge-pending"}`}>
                        {item.status === "CONFIRMED" ? "Confirmed" : item.status}
                      </span>
                    </div>
                  ))
                )}
              </div>

              <div className="panel actions-panel">
                <h2>Quick actions</h2>
                <button className="action-btn" type="button" onClick={() => setShowAddPatient(true)}>Add new patient</button>
                <button className="action-btn" type="button" onClick={() => setShowAddDoctor(true)}>Add new doctor</button>
                <button
                  className="action-btn action-btn-notification"
                  type="button"
                  onClick={openDoctorApprovalRecords}
                  aria-label={`Review doctor applications${pendingDoctors.length ? `, ${pendingDoctors.length} pending` : ""}`}
                >
                  <span>Review doctor applications</span>
                  {pendingDoctors.length > 0 && (
                    <span className="admin-notification-indicator" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none">
                        <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
                      </svg>
                      <span className="admin-notification-count">{pendingDoctors.length > 99 ? "99+" : pendingDoctors.length}</span>
                    </span>
                  )}
                </button>
                <button className="action-btn">Book appointment</button>
                <button className="action-btn">View staff roster</button>
                <button className="action-btn">Generate a bill</button>
              </div>
            </div>

            <div className="table-panel">
              <div className="patient-table-header">
                <div>
                  <h2>Recent patients</h2>
                  <p>{patientTotalElements ?? (patientsAreServerPaged ? `${patients.length} on this page` : patients.length)} patient records</p>
                </div>
                <button className="btn-secondary patient-pdf-button" type="button" onClick={downloadPatientsPdf} disabled={patients.length === 0 || patientsPdfBusy}>
                  {patientsPdfBusy ? "Preparing PDF..." : "Download PDF"}
                </button>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Doctor</th>
                    <th>Patient ID</th>
                    <th>Gender</th>
                    <th>Registered On</th>
                  </tr>
                </thead>
                <tbody>
                  {visiblePatients.length === 0 ? (
                    <tr><td className="patient-empty-row" colSpan="5">No patient records available.</td></tr>
                  ) : visiblePatients.map((p, index) => (
                    <tr key={p.patientCode || p.id || p.email || `${patientsPage}-${index}`}>
                      <td>{p.name || p.fullName || p.user?.fullName || "—"}</td>
                      <td>{p.doctorName || p.doctor?.fullName || p.doctor?.user?.fullName || p.assignedDoctor || "—"}</td>
                      <td>{p.patientCode || p.id || "—"}</td>
                      <td>{p.gender || "—"}</td>
                      <td>{formatPatientDate(p.registeredOn || p.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="patient-pagination">
                {patientPageError && <p className="patient-pagination-error" role="alert">{patientPageError}</p>}
                <label>
                  Rows per page
                  <select
                    value={patientPageSize}
                    onChange={handlePatientPageSizeChange}
                    disabled={patientPageLoading}
                  >
                    {[5, 10, 20].map((size) => <option key={size} value={size}>{size}</option>)}
                  </select>
                </label>
                <span>
                  Showing {visiblePatients.length === 0 ? 0 : patientPageStart + 1}–{patientPageStart + visiblePatients.length}
                  {patientTotalElements != null ? ` of ${patientTotalElements}` : " patients"}
                </span>
                <div className="patient-page-buttons">
                  <button type="button" className="btn-secondary" onClick={() => changePatientPage(patientsPage - 1)} disabled={patientsPage === 0 || patientPageLoading}>
                    {patientPageLoading && patientsPage > 0 ? "Loading..." : "Previous"}
                  </button>
                  <span>Page {patientsPage + 1}{patientTotalPages != null ? ` of ${patientTotalPages}` : patientsAreServerPaged ? "" : ` of ${patientPageCount}`}</span>
                  <button type="button" className="btn-secondary" onClick={() => changePatientPage(patientsPage + 1)} disabled={!canGoToNextPatientPage || patientPageLoading}>
                    {patientPageLoading ? "Loading..." : "View more"}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {recordType && (
        <div className="modal-backdrop" role="presentation" onClick={closeRecords}>
          <section className="record-modal" role="dialog" aria-modal="true" aria-labelledby="record-modal-title" onClick={(event) => event.stopPropagation()}>
            <div className="record-modal-head">
              <h2 id="record-modal-title">{viewingRecord ? `${recordTitle} details` : recordTitle}</h2>
              <button className="modal-close" type="button" aria-label="Close records" onClick={closeRecords}>×</button>
            </div>
            {viewingRecord ? (
              <div className="record-details">
                {recordType === "patients" && (
                  <>
                    <div className="record-detail-row"><span>Name</span><strong>{viewingRecord.name || viewingRecord.fullName || viewingRecord.user?.fullName || "-"}</strong></div>
                    <div className="record-detail-row"><span>Patient ID</span><strong>{viewingRecord.patientCode || "-"}</strong></div>
                    <div className="record-detail-row"><span>Gender</span><strong>{viewingRecord.gender || "-"}</strong></div>
                    <div className="record-detail-row"><span>Email</span><strong>{viewingRecord.email || viewingRecord.user?.email || viewingRecord.patient?.email || viewingRecord.patient?.user?.email || "-"}</strong></div>
                    <div className="record-detail-row"><span>Registered On</span><strong>{viewingRecord.registeredOn || viewingRecord.createdAt || viewingRecord.user?.createdAt || "-"}</strong></div>
                  </>
                )}
                {recordType === "doctors" && (
                  <>
                    <div className="record-detail-row"><span>Name</span><strong>{viewingRecord.user?.fullName || viewingRecord.fullName || viewingRecord.name || "-"}</strong></div>
                    <div className="record-detail-row"><span>Doctor ID</span><strong>{viewingRecord.id || "-"}</strong></div>
                    <div className="record-detail-row"><span>Email</span><strong>{viewingRecord.user?.email || viewingRecord.email || "-"}</strong></div>
                    <div className="record-detail-row"><span>Specialization</span><strong>{viewingRecord.specialization || "-"}</strong></div>
                    <div className="record-detail-row"><span>Department</span><strong>{viewingRecord.department || "-"}</strong></div>
                    <div className="record-detail-row"><span>Availability</span><strong>{viewingRecord.availableFrom && viewingRecord.availableTo ? `${viewingRecord.availableFrom} - ${viewingRecord.availableTo}` : "-"}</strong></div>
                  </>
                )}
                {recordType === "doctor-approvals" && (
                  <>
                    <div className="record-detail-row"><span>Name</span><strong>{viewingRecord.user?.fullName || viewingRecord.fullName || viewingRecord.name || "-"}</strong></div>
                    <div className="record-detail-row"><span>Email</span><strong>{viewingRecord.user?.email || viewingRecord.email || "-"}</strong></div>
                    <div className="record-detail-row"><span>Phone</span><strong>{viewingRecord.phone || "-"}</strong></div>
                    <div className="record-detail-row"><span>Specialization</span><strong>{viewingRecord.specialization || "-"}</strong></div>
                    <div className="record-detail-row"><span>Medical registration</span><strong>{viewingRecord.medicalRegistrationNumber || "-"}</strong></div>
                    <div className="record-detail-row"><span>Submitted</span><strong>{viewingRecord.submittedAt || "-"}</strong></div>
                    <div className="record-detail-row"><span>Identity document</span><strong>{viewingRecord.verificationDocumentUrl || viewingRecord.identityDocumentUrl ? <a href={viewingRecord.verificationDocumentUrl || viewingRecord.identityDocumentUrl} target="_blank" rel="noreferrer">Open secure document</a> : "Not provided"}</strong></div>
                  </>
                )}
                {(recordType === "appointments" || recordType === "pending") && (
                  <>
                    <div className="record-detail-row"><span>Patient</span><strong>{viewingRecord.patientName || viewingRecord.name || "-"}</strong></div>
                    <div className="record-detail-row"><span>Doctor</span><strong>{viewingRecord.doctorName || "-"}</strong></div>
                    <div className="record-detail-row"><span>Date and time</span><strong>{viewingRecord.appointmentDate || viewingRecord.time || "-"}</strong></div>
                    <div className="record-detail-row"><span>Reason</span><strong>{viewingRecord.reason || "-"}</strong></div>
                    <div className="record-detail-row"><span>Status</span><strong>{viewingRecord.status || "-"}</strong></div>
                  </>
                )}
                <button className="btn-secondary record-back" type="button" onClick={() => setViewingRecord(null)}>Back to list</button>
                {recordType === "doctor-approvals" && (
                  <div className="doctor-review-actions">
                    {approvalError && <div className="auth-error" role="alert">{approvalError}</div>}
                    <label htmlFor="doctor-rejection-reason">Rejection reason</label>
                    <textarea id="doctor-rejection-reason" rows="3" value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} placeholder="Required only when rejecting" />
                    <div className="doctor-review-buttons">
                      <button className="btn-danger" type="button" disabled={approvalSavingId === String(viewingRecord.id || viewingRecord.doctorId)} onClick={() => handleDoctorApproval(viewingRecord, "REJECTED")}>
                        {approvalSavingId === String(viewingRecord.id || viewingRecord.doctorId) ? "Saving..." : "Reject"}
                      </button>
                      <button className="confirm-btn" type="button" disabled={approvalSavingId === String(viewingRecord.id || viewingRecord.doctorId)} onClick={() => handleDoctorApproval(viewingRecord, "APPROVED")}>
                        {approvalSavingId === String(viewingRecord.id || viewingRecord.doctorId) ? "Saving..." : "Approve doctor"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : records.length === 0 ? (
              <>
              {approvalError && <div className="auth-error" role="alert">{approvalError}</div>}
              <p>
                {recordType === "doctor-approvals"
                  ? "There are no doctor applications awaiting review."
                  : recordType === "pending" && stats?.pendingAppointments > 0
                  ? `${stats.pendingAppointments} pending confirmation exists, but appointment details were not returned by the backend.`
                  : `No ${recordType} found.`}
              </p>
              </>
            ) : (
              <div className="record-modal-list">
                {records.map((record, index) => (
                  <div className="record-modal-item" key={record.patientCode || record.doctorCode || record.id || index}>
                    <strong>{record.name || record.fullName || record.patientName || record.doctorName || record.user?.fullName || "Unnamed"}</strong>
                    <span>{record.time || record.patientCode || record.doctorCode || record.email || record.user?.email || `Doctor ID: ${record.id || "-"}`}</span>
                    <span>{record.specialization || record.status || record.gender || record.registeredOn || "-"}</span>
                    <button className="record-view-button" type="button" aria-label={`View details for ${record.name || record.fullName || record.user?.fullName || record.patientName || "record"}`} title="View details" onClick={() => setViewingRecord(record)}>
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="2.5" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {showAddPatient && (
        <div className="modal-backdrop" role="presentation" onClick={() => setShowAddPatient(false)}>
          <section className="record-modal" role="dialog" aria-modal="true" aria-labelledby="add-patient-title" onClick={(event) => event.stopPropagation()}>
            <div className="record-modal-head">
              <h2 id="add-patient-title">Add new patient</h2>
              <button className="modal-close" type="button" aria-label="Close add patient form" onClick={() => setShowAddPatient(false)}>×</button>
            </div>
            {patientError && <div className="auth-error" role="alert">{patientError}</div>}
            <form className="record-form" onSubmit={handleAddPatient}>
              <label htmlFor="patient-full-name">Full name</label>
              <input id="patient-full-name" name="fullName" value={patientForm.fullName} onChange={handlePatientChange} required />

              <label htmlFor="patient-email">Email</label>
              <input id="patient-email" type="email" name="email" value={patientForm.email} onChange={handlePatientChange} required />

              <label htmlFor="patient-password">Temporary password</label>
              <input id="patient-password" type="password" name="password" value={patientForm.password} onChange={handlePatientChange} minLength={6} required />

              <label htmlFor="patient-gender">Gender</label>
              <select id="patient-gender" name="gender" value={patientForm.gender} onChange={handlePatientChange} required>
                <option value="">Select gender</option>
                <option value="FEMALE">Female</option>
                <option value="MALE">Male</option>
                <option value="OTHER">Other</option>
                <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
              </select>

              <button className="confirm-btn" type="submit" disabled={patientSaving}>
                {patientSaving ? "Adding patient..." : "Add patient"}
              </button>
            </form>
          </section>
        </div>
      )}

      {showAddDoctor && (
        <div className="modal-backdrop" role="presentation" onClick={() => setShowAddDoctor(false)}>
          <section className="record-modal" role="dialog" aria-modal="true" aria-labelledby="add-doctor-title" onClick={(event) => event.stopPropagation()}>
            <div className="record-modal-head">
              <h2 id="add-doctor-title">Add new doctor</h2>
              <button className="modal-close" type="button" aria-label="Close add doctor form" onClick={() => setShowAddDoctor(false)}>×</button>
            </div>
            {doctorError && <div className="auth-error" role="alert">{doctorError}</div>}
            <form className="record-form" onSubmit={handleAddDoctor}>
              <label htmlFor="doctor-full-name">Full name</label>
              <input id="doctor-full-name" name="fullName" value={doctorForm.fullName} onChange={handleDoctorChange} required />

              <label htmlFor="doctor-email">Email</label>
              <input id="doctor-email" type="email" name="email" value={doctorForm.email} onChange={handleDoctorChange} required />

              <label htmlFor="doctor-password">Temporary password</label>
              <input id="doctor-password" type="password" name="password" value={doctorForm.password} onChange={handleDoctorChange} minLength={6} required />

              <label htmlFor="doctor-specialization">Specialization</label>
              <input id="doctor-specialization" name="specialization" value={doctorForm.specialization} onChange={handleDoctorChange} placeholder="e.g. Cardiology" required />

              <button className="confirm-btn" type="submit" disabled={doctorSaving}>
                {doctorSaving ? "Adding doctor..." : "Add doctor"}
              </button>
            </form>
          </section>
        </div>
      )}

      <AppFooter />
    </div>
  );
}