import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import axiosClient from "../api/axiosClient";
import loadRazorpayCheckout from "../api/razorpayCheckout";
import { useAuth } from "../context/AuthContext";
import Header from "../components/Header.jsx";
import AppFooter from "../components/AppFooter.jsx";

const DEFAULT_PATIENT_PAGE_SIZE = 5;

function toLocalDateTimeValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

const STAFF_NAV = [
  { label: "Dashboard", to: "/admin-dashboard" },
  { label: "Patients", to: "/admin-dashboard?section=patients" },
  { label: "Appointments", to: "/admin-dashboard?section=appointments" },
  { label: "Lab reports", to: "/lab-reports" },
  { label: "Staff", to: "/admin-dashboard?section=staff" },
  { label: "Billing", to: "/admin-dashboard?section=billing" },
];

function getRecordList(data, keys = []) {
  if (Array.isArray(data)) return data;
  for (const key of keys) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  return [];
}

async function getAdminPatientsPage(page, size, search = "") {
  const params = { page, size };
  if (search.trim()) params.search = search.trim();
  return axiosClient.get("/admin/patients", { params });
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

function formatAppointmentDate(value) {
  if (!value) return "Date not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
}

function formatInvoiceAmount(amountPaise) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format((Number(amountPaise) || 0) / 100);
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
  const location = useLocation();
  const navigate = useNavigate();
  const activeSection = new URLSearchParams(location.search).get("section") || "dashboard";
  const [stats, setStats] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [adminAppointments, setAdminAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [billingPatients, setBillingPatients] = useState([]);
  const [staff, setStaff] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [razorpayConfig, setRazorpayConfig] = useState({ enabled: false, keyId: null });
  const [invoiceForm, setInvoiceForm] = useState({
    patientId: "",
    amountRupees: "",
    appointmentId: "",
    description: "",
  });
  const [billingPatientSearch, setBillingPatientSearch] = useState("");
  const [doctors, setDoctors] = useState([]);
  const [pendingDoctors, setPendingDoctors] = useState([]);
  const [pendingAppointments, setPendingAppointments] = useState([]);
  const [recordType, setRecordType] = useState(null);
  const [viewingRecord, setViewingRecord] = useState(null);
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [showAddDoctor, setShowAddDoctor] = useState(false);
  const [showAddLabStaff, setShowAddLabStaff] = useState(false);
  const [showBookAppointment, setShowBookAppointment] = useState(false);
  const [patientForm, setPatientForm] = useState({ fullName: "", email: "", password: "", gender: "" });
  const [doctorForm, setDoctorForm] = useState({ fullName: "", email: "", password: "", specialization: "" });
  const [labStaffForm, setLabStaffForm] = useState({ fullName: "", email: "", password: "" });
  const [appointmentForm, setAppointmentForm] = useState({
    patientType: "existing",
    patientEmail: "",
    fullName: "",
    password: "",
    doctorId: "",
    appointmentDate: "",
    reason: "",
  });
  const [patientError, setPatientError] = useState("");
  const [doctorError, setDoctorError] = useState("");
  const [labStaffError, setLabStaffError] = useState("");
  const [labStaffSuccess, setLabStaffSuccess] = useState("");
  const [appointmentError, setAppointmentError] = useState("");
  const [appointmentSuccess, setAppointmentSuccess] = useState("");
  const [appointmentListError, setAppointmentListError] = useState("");
  const [appointmentListLoading, setAppointmentListLoading] = useState(false);
  const [staffError, setStaffError] = useState("");
  const [staffLoading, setStaffLoading] = useState(false);
  const [billingError, setBillingError] = useState("");
  const [billingSuccess, setBillingSuccess] = useState("");
  const [billingLoading, setBillingLoading] = useState(false);
  const [invoiceSaving, setInvoiceSaving] = useState(false);
  const [payingInvoiceId, setPayingInvoiceId] = useState(null);
  const [staffFilter, setStaffFilter] = useState("ALL");
  const [patientSearch, setPatientSearch] = useState("");
  const [patientDirectoryLoading, setPatientDirectoryLoading] = useState(false);
  const [patientAppointments, setPatientAppointments] = useState([]);
  const [patientAppointmentsLoading, setPatientAppointmentsLoading] = useState(false);
  const [patientAppointmentsError, setPatientAppointmentsError] = useState("");
  const [patientSaving, setPatientSaving] = useState(false);
  const [doctorSaving, setDoctorSaving] = useState(false);
  const [labStaffSaving, setLabStaffSaving] = useState(false);
  const [appointmentSaving, setAppointmentSaving] = useState(false);
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
    if (activeSection === "appointments") {
      openAppointmentRecords();
    } else {
      setRecordType(null);
    }
  }, [location.search]);

  useEffect(() => {
    if (activeSection !== "patients") return undefined;
    const timer = setTimeout(() => loadPatientDirectory(0), 250);
    return () => clearTimeout(timer);
  }, [activeSection, patientSearch, patientPageSize]);

  useEffect(() => {
    if (activeSection === "staff") loadStaffDirectory();
  }, [activeSection]);

  useEffect(() => {
    if (activeSection === "billing") loadBillingWorkspace();
  }, [activeSection]);

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
  const visibleStaff = staff.filter((member) => {
    if (staffFilter === "ALL") return true;
    if (staffFilter === "DOCTORS") return member.role === "DOCTOR";
    if (staffFilter === "LAB_TECH") return member.role === "LAB_TECH";
    return member.role === "DOCTOR" && member.status === "PENDING_REVIEW";
  });
  const selectedBillingPatient = billingPatients.find(
    (patient) => String(patient.id) === String(invoiceForm.patientId)
  );
  const billingPatientAppointments = adminAppointments
    .filter((appointment) => String(appointment.patientId) === String(invoiceForm.patientId))
    .sort((first, second) => new Date(second.appointmentDate) - new Date(first.appointmentDate));
  const filteredBillingPatients = billingPatients.filter((patient) => {
    const query = billingPatientSearch.trim().toLowerCase();
    return !query || `${patient.name} ${patient.patientCode} ${patient.email}`.toLowerCase().includes(query);
  });

  const records =
    recordType === "patients"
      ? patients
      : recordType === "doctors"
        ? approvedDoctors
        : recordType === "doctor-approvals"
            ? pendingDoctors
          : recordType === "pending"
            ? pendingAppointments
            : recordType === "today"
              ? schedule
            : recordType === "appointments"
              ? adminAppointments
              : schedule;

  const recordTitle = {
    patients: "Patient records",
    doctors: "Doctor records",
    "doctor-approvals": "Doctor applications awaiting review",
    appointments: "All appointments",
    pending: "Appointments for review",
    today: "Today's appointments",
  }[recordType];

  function openTodayAppointments() {
    setRecordType("today");
    setViewingRecord(null);
    setAppointmentListError("");
  }

  async function openAppointmentRecords() {
    setRecordType("appointments");
    setViewingRecord(null);
    setAppointmentListError("");
    setAppointmentListLoading(true);
    try {
      const response = await axiosClient.get("/admin/appointments");
      setAdminAppointments(getRecordList(response.data, ["appointments", "items", "content", "data"]));
    } catch (error) {
      setAdminAppointments([]);
      setAppointmentListError(
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Unable to load appointments."
      );
    } finally {
      setAppointmentListLoading(false);
    }
  }

  async function loadPatientDirectory(page = 0) {
    setPatientDirectoryLoading(true);
    setPatientPageError("");
    try {
      const response = await getAdminPatientsPage(page, patientPageSize, patientSearch);
      const pageData = getPatientPage(response.data, patientPageSize);
      const totalPages = pageData.totalPages
        ?? (pageData.totalElements == null ? null : Math.ceil(pageData.totalElements / patientPageSize));
      setPatients(pageData.records.map(normalizePatientRecord));
      setPatientsPage(page);
      setPatientsAreServerPaged(true);
      setPatientPageHasMore(totalPages == null ? pageData.records.length === patientPageSize : page + 1 < totalPages);
      setPatientTotalElements(pageData.totalElements ?? null);
      setPatientTotalPages(totalPages);
    } catch (error) {
      setPatients([]);
      setPatientPageError(error?.response?.data?.message || error?.response?.data?.error || "Unable to load patients.");
    } finally {
      setPatientDirectoryLoading(false);
    }
  }

  async function loadStaffDirectory() {
    setStaffLoading(true);
    setStaffError("");
    try {
      const response = await axiosClient.get("/admin/staff");
      setStaff(getRecordList(response.data, ["staff", "items", "content", "data"]));
    } catch (error) {
      setStaff([]);
      setStaffError(error?.response?.data?.message || error?.response?.data?.error || "Unable to load staff.");
    } finally {
      setStaffLoading(false);
    }
  }

  async function loadBillingWorkspace() {
    setBillingLoading(true);
    setBillingError("");
    try {
      const [configResponse, invoicesResponse, patientsResponse, appointmentsResponse] = await Promise.all([
        axiosClient.get("/admin/billing/config"),
        axiosClient.get("/admin/invoices"),
        getAdminPatientsPage(0, 100),
        axiosClient.get("/admin/appointments"),
      ]);
      setRazorpayConfig(configResponse.data);
      setInvoices(getRecordList(invoicesResponse.data, ["invoices", "items", "content", "data"]));
      const patientPage = getPatientPage(patientsResponse.data, 100);
      const allPatientRecords = [...patientPage.records];
      const patientPageCount = patientPage.totalPages
        ?? (patientPage.totalElements == null ? 1 : Math.ceil(patientPage.totalElements / 100));
      if (patientPageCount > 1) {
        const restOfPages = await Promise.all(
          Array.from({ length: patientPageCount - 1 }, (_, index) => getAdminPatientsPage(index + 1, 100))
        );
        restOfPages.forEach((response) => {
          allPatientRecords.push(...getPatientPage(response.data, 100).records);
        });
      }
      setBillingPatients(allPatientRecords.map(normalizePatientRecord));
      setAdminAppointments(getRecordList(appointmentsResponse.data, ["appointments", "items", "content", "data"]));
    } catch (error) {
      setBillingError(error?.response?.data?.message || error?.response?.data?.error || "Unable to load billing information.");
    } finally {
      setBillingLoading(false);
    }
  }

  function handleInvoiceFormChange(event) {
    const { name, value } = event.target;
    setInvoiceForm((current) => ({
      ...current,
      [name]: value,
      ...(name === "patientId" ? { appointmentId: "" } : {}),
    }));
  }

  async function handleCreateInvoice(event) {
    event.preventDefault();
    setBillingError("");
    setBillingSuccess("");
    setInvoiceSaving(true);
    const selectedPatient = billingPatients.find((patient) => String(patient.id) === String(invoiceForm.patientId));
    const amount = Number(invoiceForm.amountRupees);
    const amountPaise = Math.round(amount * 100);
    if (!Number.isFinite(amount) || amountPaise < 100) {
      setBillingError("Enter an invoice amount of at least ₹1.00.");
      setInvoiceSaving(false);
      return;
    }
    if (!selectedPatient?.email) {
      setBillingError("Select a patient with a registered email address.");
      setInvoiceSaving(false);
      return;
    }

    try {
      const response = await axiosClient.post("/admin/invoices", {
        patientEmail: selectedPatient.email,
        amountPaise,
        description: invoiceForm.description.trim(),
        appointmentId: invoiceForm.appointmentId ? Number(invoiceForm.appointmentId) : null,
      });
      setInvoices((current) => [response.data, ...current]);
      setInvoiceForm({ patientId: "", amountRupees: "", appointmentId: "", description: "" });
      setBillingSuccess(`Invoice ${response.data.invoiceNumber} created.`);
    } catch (error) {
      setBillingError(error?.response?.data?.message || error?.response?.data?.error || "Unable to create invoice.");
    } finally {
      setInvoiceSaving(false);
    }
  }

  async function handleCollectPayment(invoice) {
    setBillingError("");
    setBillingSuccess("");
    setPayingInvoiceId(invoice.id);
    try {
      const { data: order } = await axiosClient.post(`/admin/invoices/${invoice.id}/payment-order`);
      await loadRazorpayCheckout();
      if (!window.Razorpay) throw new Error("Razorpay Checkout did not initialize.");

      const checkout = new window.Razorpay({
        key: order.keyId,
        amount: order.amountPaise,
        currency: order.currency,
        name: "Sanraksha Hospital",
        description: order.invoiceNumber,
        order_id: order.orderId,
        prefill: { name: order.patientName, email: order.patientEmail },
        theme: { color: "#8a2a2a" },
        handler: async (payment) => {
          try {
            const verified = await axiosClient.post(`/admin/invoices/${invoice.id}/verify-payment`, {
              razorpayOrderId: payment.razorpay_order_id,
              razorpayPaymentId: payment.razorpay_payment_id,
              razorpaySignature: payment.razorpay_signature,
            });
            setInvoices((current) => current.map((item) => item.id === invoice.id ? verified.data : item));
            setBillingSuccess(`Payment received for invoice ${invoice.invoiceNumber}.`);
          } catch (error) {
            setBillingError(error?.response?.data?.message || error?.response?.data?.error || "Payment could not be verified. Check the invoice before retrying.");
          } finally {
            setPayingInvoiceId(null);
          }
        },
        modal: {
          ondismiss: () => setPayingInvoiceId(null),
        },
      });
      checkout.on("payment.failed", (event) => {
        setBillingError(event?.error?.description || "Razorpay reported that the payment failed.");
        setPayingInvoiceId(null);
      });
      checkout.open();
    } catch (error) {
      setBillingError(error?.response?.data?.message || error?.response?.data?.error || error?.message || "Unable to start Razorpay Checkout.");
      setPayingInvoiceId(null);
    }
  }

  async function openPatientRecord(patient) {
    setRecordType("patients");
    setViewingRecord(patient);
    setPatientAppointments([]);
    setPatientAppointmentsError("");
    setPatientAppointmentsLoading(true);
    try {
      const response = await axiosClient.get(`/admin/patients/${patient.id}/appointments`);
      setPatientAppointments(getRecordList(response.data, ["appointments", "items", "content", "data"]));
    } catch (error) {
      setPatientAppointmentsError(error?.response?.data?.message || error?.response?.data?.error || "Unable to load patient appointment history.");
    } finally {
      setPatientAppointmentsLoading(false);
    }
  }

  function closeRecords() {
    setRecordType(null);
    setViewingRecord(null);
    setApprovalError("");
    setRejectionReason("");
    if (new URLSearchParams(location.search).get("section") === "appointments") {
      navigate("/admin-dashboard", { replace: true });
    }
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
    setViewingRecord(null);
    setAppointmentListError("");
    setAppointmentListLoading(true);
    try {
      const response = await axiosClient.get("/admin/pending-appointments");
      setPendingAppointments(getRecordList(response.data, ["appointments", "pendingAppointments", "items", "content", "data"]));
    } catch (error) {
      setPendingAppointments([]);
      setAppointmentListError(
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Unable to load appointments for review."
      );
    } finally {
      setAppointmentListLoading(false);
    }
  }

  function handlePatientChange(event) {
    setPatientForm({ ...patientForm, [event.target.name]: event.target.value });
  }

  function openBookAppointment() {
    const appointmentDate = new Date();
    appointmentDate.setHours(appointmentDate.getHours() + 1, 0, 0, 0);
    setAppointmentError("");
    setAppointmentSuccess("");
    setAppointmentForm({
      patientType: "existing",
      patientEmail: "",
      fullName: "",
      password: "",
      doctorId: String(approvedDoctors[0]?.id || approvedDoctors[0]?.doctorId || ""),
      appointmentDate: toLocalDateTimeValue(appointmentDate),
      reason: "",
    });
    setShowBookAppointment(true);
  }

  function handleAppointmentChange(event) {
    setAppointmentForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleBookAppointment(event) {
    event.preventDefault();
    setAppointmentError("");
    setAppointmentSaving(true);
    const patientEmail = appointmentForm.patientEmail.trim();

    try {
      const response = await axiosClient.post("/admin/appointments", {
        patientEmail,
        createPatient: appointmentForm.patientType === "new",
        fullName: appointmentForm.patientType === "new" ? appointmentForm.fullName.trim() : null,
        password: appointmentForm.patientType === "new" ? appointmentForm.password : null,
        doctorId: Number(appointmentForm.doctorId),
        appointmentDate: appointmentForm.appointmentDate,
        reason: appointmentForm.reason.trim() || null,
      });

      const status = response.data?.status || "PENDING";
      setAppointmentSuccess(`Appointment booked for ${patientEmail}. Status: ${status}.`);
      setShowBookAppointment(false);

      const refreshResults = await Promise.allSettled([
        axiosClient.get("/admin/today-schedule"),
        axiosClient.get("/admin/stats"),
        ...(appointmentForm.patientType === "new" ? [getAdminPatientsPage(0, patientPageSize)] : []),
        axiosClient.get("/admin/appointments"),
        axiosClient.get("/admin/pending-appointments"),
      ]);
      if (refreshResults[0].status === "fulfilled") {
        setSchedule(getRecordList(refreshResults[0].value.data, ["appointments", "schedule", "items", "content", "data"]));
      }
      if (refreshResults[1].status === "fulfilled") setStats(refreshResults[1].value.data);
      const appointmentListIndex = appointmentForm.patientType === "new" ? 3 : 2;
      const pendingListIndex = appointmentListIndex + 1;
      if (refreshResults[appointmentListIndex].status === "fulfilled") {
        setAdminAppointments(getRecordList(refreshResults[appointmentListIndex].value.data, ["appointments", "items", "content", "data"]));
      }
      if (refreshResults[pendingListIndex].status === "fulfilled") {
        setPendingAppointments(getRecordList(refreshResults[pendingListIndex].value.data, ["appointments", "pendingAppointments", "items", "content", "data"]));
      }
      if (appointmentForm.patientType === "new" && refreshResults[2]?.status === "fulfilled") {
        const patientPageData = getPatientPage(refreshResults[2].value.data, patientPageSize);
        const totalPages = patientPageData.totalPages
          ?? (patientPageData.totalElements == null ? null : Math.ceil(patientPageData.totalElements / patientPageSize));
        const serverPaged = patientPageData.records.length <= patientPageSize
          && ((patientPageData.totalElements != null && patientPageData.totalElements > patientPageData.records.length)
            || (totalPages != null && totalPages > 1));
        setPatients(patientPageData.records.map(normalizePatientRecord));
        setPatientsPage(0);
        setPatientsAreServerPaged(serverPaged);
        setPatientTotalElements(patientPageData.totalElements ?? null);
        setPatientTotalPages(totalPages);
        setPatientPageHasMore(serverPaged && (totalPages != null
          ? totalPages > 1
          : patientPageData.records.length === patientPageSize));
      }
      if (refreshResults.some((result) => result.status === "rejected")) {
        setAppointmentSuccess(`Appointment booked for ${patientEmail}. The dashboard could not refresh all data; reload the page to see the latest records.`);
      }
    } catch (error) {
      setAppointmentError(
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        "Unable to book the appointment."
      );
    } finally {
      setAppointmentSaving(false);
    }
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
      setPatientSearch("");
      const patientsResponse = await getAdminPatientsPage(0, patientPageSize);
      const patientPageData = getPatientPage(patientsResponse.data, patientPageSize);
      setPatients(patientPageData.records.map(normalizePatientRecord));
      setPatientsPage(0);
      setPatientsAreServerPaged(true);
      setPatientTotalElements(patientPageData.totalElements ?? null);
      setPatientTotalPages(patientPageData.totalPages ?? null);
      setPatientPageHasMore(patientPageData.totalPages != null
        ? patientPageData.totalPages > 1
        : patientPageData.records.length === patientPageSize);
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
      await loadStaffDirectory();

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

  function handleLabStaffChange(event) {
    setLabStaffForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleAddLabStaff(event) {
    event.preventDefault();
    setLabStaffError("");
    setLabStaffSuccess("");
    setLabStaffSaving(true);

    try {
      const { data } = await axiosClient.post("/admin/lab-staff", labStaffForm);
      const staffName = data?.fullName || labStaffForm.fullName.trim();
      setLabStaffSuccess(`${staffName} was added as lab technical staff. They must change the temporary password when they first sign in.`);
      setLabStaffForm({ fullName: "", email: "", password: "" });
      setShowAddLabStaff(false);
      await loadStaffDirectory();
    } catch (error) {
      setLabStaffError(error?.response?.data?.message || error?.response?.data?.error || "Unable to create the lab staff account.");
    } finally {
      setLabStaffSaving(false);
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
      const response = await getAdminPatientsPage(nextPage, requestedPageSize, patientSearch);
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
    if (activeSection !== "patients" && patientsAreServerPaged) changePatientPage(0, nextSize);
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
          <h1>{activeSection === "dashboard"
            ? `${greeting}, ${user?.fullName?.split(" ")[0] || "Admin"}`
            : activeSection === "patients"
              ? "Patient directory"
              : activeSection === "staff"
                ? "Staff management"
                : activeSection === "billing"
                  ? "Billing"
                  : "Here's what's happening across the hospital today."}</h1>
          <p>{activeSection === "dashboard"
            ? "Here's what's happening across the hospital today."
            : activeSection === "patients"
              ? "Search patient accounts and review their appointment history."
              : activeSection === "staff"
                ? "View doctors and lab staff, check account status, and review doctor applications."
                : activeSection === "billing"
                  ? "Manage invoices and payments for hospital services."
                  : ""}</p>
        </div>

        {loading ? (
          <p>Loading dashboard...</p>
        ) : activeSection === "patients" ? (
          <div className="table-panel admin-workspace-panel">
            <div className="patient-table-header">
              <div>
                <h2>All patients</h2>
                <p>{patientTotalElements ?? patients.length} patient records</p>
              </div>
              <div className="admin-workspace-actions">
                <button className="btn-secondary patient-pdf-button" type="button" onClick={downloadPatientsPdf} disabled={patients.length === 0 || patientsPdfBusy}>
                  {patientsPdfBusy ? "Preparing PDF..." : "Download PDF"}
                </button>
                <button className="confirm-btn" type="button" onClick={() => setShowAddPatient(true)}>Add new patient</button>
              </div>
            </div>
            <div className="admin-workspace-toolbar">
              <label className="admin-search-field">
                <span className="sr-only">Search patients by name or email</span>
                <input
                  type="search"
                  value={patientSearch}
                  onChange={(event) => {
                    setPatientSearch(event.target.value);
                    setPatientsPage(0);
                  }}
                  placeholder="Search patients by name or email"
                />
              </label>
              {patientDirectoryLoading && <span role="status">Loading patients...</span>}
            </div>
            {patientPageError && <p className="patient-pagination-error admin-workspace-error" role="alert">{patientPageError}</p>}
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Patient ID</th>
                  <th>Gender</th>
                  <th>Phone</th>
                  <th>Registered On</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {patients.length === 0 && !patientDirectoryLoading ? (
                  <tr><td className="patient-empty-row" colSpan="7">{patientSearch ? "No patients match your search." : "No patient records available."}</td></tr>
                ) : patients.map((patient, index) => (
                  <tr key={patient.id || patient.patientCode || `${patientsPage}-${index}`}>
                    <td>{patient.name}</td>
                    <td>{patient.email || "—"}</td>
                    <td>{patient.patientCode || "—"}</td>
                    <td>{patient.gender || "—"}</td>
                    <td>{patient.phone || "—"}</td>
                    <td>{formatPatientDate(patient.registeredOn || patient.createdAt)}</td>
                    <td><button className="btn-secondary patient-view-button" type="button" aria-label={`View ${patient.name}'s details`} onClick={() => openPatientRecord(patient)}>View</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="patient-pagination">
              <label>
                Rows per page
                <select value={patientPageSize} onChange={handlePatientPageSizeChange} disabled={patientDirectoryLoading}>
                  {[5, 10, 20].map((size) => <option key={size} value={size}>{size}</option>)}
                </select>
              </label>
              <span>
                Showing {patients.length === 0 ? 0 : patientPageStart + 1}–{patientPageStart + patients.length}
                {patientTotalElements != null ? ` of ${patientTotalElements}` : " patients"}
              </span>
              <div className="patient-page-buttons">
                <button type="button" className="btn-secondary" onClick={() => changePatientPage(patientsPage - 1)} disabled={patientsPage === 0 || patientDirectoryLoading || patientPageLoading}>
                  Previous
                </button>
                <span>Page {patientsPage + 1}{patientTotalPages != null ? ` of ${patientTotalPages}` : ""}</span>
                <button type="button" className="btn-secondary" onClick={() => changePatientPage(patientsPage + 1)} disabled={!canGoToNextPatientPage || patientDirectoryLoading || patientPageLoading}>
                  Next
                </button>
              </div>
            </div>
          </div>
        ) : activeSection === "staff" ? (
          <div className="table-panel admin-workspace-panel">
            <div className="patient-table-header">
              <div>
                <h2>Hospital staff</h2>
                <p>{staff.length} staff accounts</p>
              </div>
              <div className="admin-workspace-actions">
                <button className="btn-secondary" type="button" onClick={openDoctorApprovalRecords}>
                  Review doctor applications{pendingDoctors.length ? ` (${pendingDoctors.length})` : ""}
                </button>
                <button className="confirm-btn" type="button" onClick={() => setShowAddDoctor(true)}>Add doctor</button>
                <button className="btn-secondary" type="button" onClick={() => setShowAddLabStaff(true)}>Add lab staff</button>
              </div>
            </div>
            {labStaffSuccess && <p className="lab-feedback success admin-workspace-feedback" role="status">{labStaffSuccess}</p>}
            <div className="admin-workspace-toolbar admin-staff-filters" role="group" aria-label="Filter staff">
              {[
                ["ALL", "All staff"],
                ["DOCTORS", "Doctors"],
                ["LAB_TECH", "Lab staff"],
                ["PENDING", "Pending review"],
              ].map(([filter, label]) => (
                <button
                  key={filter}
                  type="button"
                  className={`btn-secondary ${staffFilter === filter ? "active" : ""}`}
                  aria-pressed={staffFilter === filter}
                  onClick={() => setStaffFilter(filter)}
                >
                  {label}
                </button>
              ))}
              <button className="btn-secondary" type="button" disabled={staffLoading} onClick={loadStaffDirectory}>
                {staffLoading ? "Refreshing..." : "Refresh"}
              </button>
            </div>
            {staffError && <p className="patient-pagination-error admin-workspace-error" role="alert">{staffError}</p>}
            {staffLoading ? <p className="admin-workspace-message">Loading staff...</p> : (
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Specialization</th>
                    <th>Status</th>
                    <th>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleStaff.length === 0 ? (
                    <tr><td className="patient-empty-row" colSpan="6">No staff accounts in this category.</td></tr>
                  ) : visibleStaff.map((member) => (
                    <tr key={`${member.role}-${member.id}`}>
                      <td>{member.fullName}</td>
                      <td>{member.email}</td>
                      <td>{member.role === "LAB_TECH" ? "Lab staff" : "Doctor"}</td>
                      <td>{member.specialization || "—"}</td>
                      <td><span className={`staff-status staff-status-${String(member.status).toLowerCase()}`}>{String(member.status).replaceAll("_", " ")}</span></td>
                      <td>{formatPatientDate(member.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ) : activeSection === "billing" ? (
          <>
            <div className="stat-strip billing-stat-strip">
              <div className="stat">
                <span className="value">{invoices.length}</span>
                <span className="label">Invoices issued</span>
              </div>
              <div className="stat">
                <span className="value">{formatInvoiceAmount(invoices.filter((invoice) => invoice.status === "PENDING").reduce((sum, invoice) => sum + invoice.amountPaise, 0))}</span>
                <span className="label">Outstanding</span>
              </div>
              <div className="stat">
                <span className="value">{formatInvoiceAmount(invoices.filter((invoice) => invoice.status === "PAID").reduce((sum, invoice) => sum + invoice.amountPaise, 0))}</span>
                <span className="label">Payments received</span>
              </div>
            </div>

            <div className="panel invoice-create-panel">
              <div className="invoice-panel-heading">
                <div>
                  <h2>Create an invoice</h2>
                  <p>Issue a bill to an existing patient. Amounts are in INR.</p>
                </div>
                <button className="btn-secondary" type="button" disabled={billingLoading} onClick={loadBillingWorkspace}>
                  {billingLoading ? "Refreshing..." : "Refresh"}
                </button>
              </div>
              {!razorpayConfig.enabled && (
                <p className="billing-gateway-notice" role="status">
                  Invoices can be created, but Razorpay checkout is disabled until test credentials are configured on the backend.
                </p>
              )}
              {billingError && <div className="auth-error" role="alert">{billingError}</div>}
              {billingSuccess && <p className="lab-feedback success" role="status">{billingSuccess}</p>}
              <form className="record-form invoice-form" onSubmit={handleCreateInvoice}>
                <label htmlFor="billing-patient-search">Find a patient</label>
                <input
                  id="billing-patient-search"
                  type="search"
                  value={billingPatientSearch}
                  onChange={(event) => setBillingPatientSearch(event.target.value)}
                  placeholder="Search by patient name, ID, or email"
                  disabled={billingLoading}
                />
                <label htmlFor="invoice-patient">Patient</label>
                <select
                  id="invoice-patient"
                  name="patientId"
                  value={invoiceForm.patientId}
                  onChange={handleInvoiceFormChange}
                  required
                  disabled={billingLoading || billingPatients.length === 0}
                >
                  <option value="" disabled>Select a patient</option>
                  {filteredBillingPatients.map((patient) => (
                    <option key={patient.id} value={patient.id}>
                      {patient.name} · {patient.patientCode || `Patient #${patient.id}`} · {patient.email || "No email"}
                    </option>
                  ))}
                </select>
                {billingPatients.length === 0 && !billingLoading && (
                  <p>No patients are available for billing.</p>
                )}
                {selectedBillingPatient && (
                  <p className="billing-selected-patient">
                    Selected: <strong>{selectedBillingPatient.name}</strong> · {selectedBillingPatient.email || "No registered email"}
                  </p>
                )}

                <div className="invoice-form-grid">
                  <div>
                    <label htmlFor="invoice-amount">Amount (INR)</label>
                    <input id="invoice-amount" type="number" name="amountRupees" value={invoiceForm.amountRupees} onChange={handleInvoiceFormChange} min="1" max="10000000" step="0.01" required />
                  </div>
                  <div>
                    <label htmlFor="invoice-appointment-id">Associated appointment (optional)</label>
                    <select
                      id="invoice-appointment-id"
                      name="appointmentId"
                      value={invoiceForm.appointmentId}
                      onChange={handleInvoiceFormChange}
                      disabled={!selectedBillingPatient}
                    >
                      <option value="">No associated appointment</option>
                      {billingPatientAppointments.map((appointment) => (
                        <option key={appointment.appointmentId} value={appointment.appointmentId}>
                          #{appointment.appointmentId} · {formatAppointmentDate(appointment.appointmentDate)} · {appointment.doctorName} · {appointment.status}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <label htmlFor="invoice-description">Description</label>
                <input id="invoice-description" name="description" value={invoiceForm.description} onChange={handleInvoiceFormChange} maxLength={255} placeholder="e.g. Consultation fee" required />

                <button className="confirm-btn" type="submit" disabled={invoiceSaving}>
                  {invoiceSaving ? "Creating invoice..." : "Create invoice"}
                </button>
              </form>
            </div>

            <div className="table-panel invoice-table-panel">
              <div className="patient-table-header">
                <div>
                  <h2>Invoices and payments</h2>
                  <p>{invoices.length} invoices</p>
                </div>
              </div>
              {billingLoading ? <p className="admin-workspace-message">Loading invoices...</p> : (
                <table>
                  <thead>
                    <tr>
                      <th>Invoice</th>
                      <th>Patient</th>
                      <th>Description</th>
                      <th>Amount</th>
                      <th>Issued</th>
                      <th>Status</th>
                      <th>Payment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.length === 0 ? (
                      <tr><td className="patient-empty-row" colSpan="7">No invoices have been issued.</td></tr>
                    ) : invoices.map((invoice) => (
                      <tr key={invoice.id}>
                        <td>{invoice.invoiceNumber}</td>
                        <td>{invoice.patientName}<br /><small>{invoice.patientEmail}</small></td>
                        <td>{invoice.description}{invoice.appointmentId ? <><br /><small>Appointment #{invoice.appointmentId}</small></> : null}</td>
                        <td>{formatInvoiceAmount(invoice.amountPaise)}</td>
                        <td>{formatPatientDate(invoice.createdAt)}</td>
                        <td><span className={`staff-status staff-status-${String(invoice.status).toLowerCase()}`}>{invoice.status}</span></td>
                        <td>
                          {invoice.status === "PAID" ? (
                            <span>{formatPatientDate(invoice.paidAt)}</span>
                          ) : (
                            <button
                              className="confirm-btn invoice-pay-button"
                              type="button"
                              disabled={!razorpayConfig.enabled || payingInvoiceId != null}
                              onClick={() => handleCollectPayment(invoice)}
                            >
                              {payingInvoiceId === invoice.id ? "Opening checkout..." : "Collect payment"}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
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
                <button className="stat-value-button" type="button" onClick={openTodayAppointments}>
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
                {labStaffSuccess && <p className="lab-feedback success" role="status">{labStaffSuccess}</p>}
                {appointmentSuccess && <p className="lab-feedback success" role="status">{appointmentSuccess}</p>}
                <button className="action-btn" type="button" onClick={() => setShowAddPatient(true)}>Add new patient</button>
                <button className="action-btn" type="button" onClick={() => setShowAddDoctor(true)}>Add new doctor</button>
                <button
                  className="action-btn"
                  type="button"
                  onClick={() => {
                    setLabStaffError("");
                    setLabStaffSuccess("");
                    setShowAddLabStaff(true);
                  }}
                >
                  Add lab technical staff
                </button>
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
                <button className="action-btn" type="button" onClick={openBookAppointment}>Book appointment</button>
                <button className="action-btn" type="button" onClick={() => navigate("/admin-dashboard?section=staff")}>View staff roster</button>
                <button className="action-btn" type="button" onClick={() => navigate("/admin-dashboard?section=billing")}>Create an invoice</button>
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
            {!viewingRecord && (recordType === "appointments" || recordType === "pending" || recordType === "today") && (
              <div className="appointment-modal-actions">
                {recordType === "appointments" ? (
                  <button className="btn-secondary" type="button" onClick={openPendingRecords}>
                    Review pending ({stats?.pendingAppointments ?? pendingAppointments.length})
                  </button>
                ) : recordType === "pending" ? (
                  <button className="btn-secondary" type="button" onClick={openAppointmentRecords}>View all appointments</button>
                ) : (
                  <button className="btn-secondary" type="button" onClick={openAppointmentRecords}>View all appointments</button>
                )}
                <button
                  className="confirm-btn"
                  type="button"
                  onClick={() => {
                    closeRecords();
                    openBookAppointment();
                  }}
                >
                  Book appointment
                </button>
              </div>
            )}
            {viewingRecord ? (
              <div className="record-details">
                {recordType === "patients" && (
                  <>
                    <div className="record-detail-row"><span>Name</span><strong>{viewingRecord.name || viewingRecord.fullName || viewingRecord.user?.fullName || "-"}</strong></div>
                    <div className="record-detail-row"><span>Patient ID</span><strong>{viewingRecord.patientCode || "-"}</strong></div>
                    <div className="record-detail-row"><span>Gender</span><strong>{viewingRecord.gender || "-"}</strong></div>
                    <div className="record-detail-row"><span>Email</span><strong>{viewingRecord.email || viewingRecord.user?.email || viewingRecord.patient?.email || viewingRecord.patient?.user?.email || "-"}</strong></div>
                    <div className="record-detail-row"><span>Phone</span><strong>{viewingRecord.phone || "-"}</strong></div>
                    <div className="record-detail-row"><span>Registered On</span><strong>{viewingRecord.registeredOn || viewingRecord.createdAt || viewingRecord.user?.createdAt || "-"}</strong></div>
                    <div className="patient-history">
                      <h3>Appointment history</h3>
                      {patientAppointmentsLoading ? (
                        <p>Loading appointment history...</p>
                      ) : patientAppointmentsError ? (
                        <p className="patient-pagination-error" role="alert">{patientAppointmentsError}</p>
                      ) : patientAppointments.length === 0 ? (
                        <p>No appointments for this patient.</p>
                      ) : patientAppointments.map((appointment) => (
                        <div className="patient-history-item" key={appointment.appointmentId}>
                          <strong>{formatAppointmentDate(appointment.appointmentDate)}</strong>
                          <span>{appointment.doctorName} · {appointment.status}</span>
                        </div>
                      ))}
                    </div>
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
                {(recordType === "appointments" || recordType === "pending" || recordType === "today") && (
                  <>
                    <div className="record-detail-row"><span>Patient</span><strong>{viewingRecord.patientName || viewingRecord.name || "-"}</strong></div>
                    {(recordType === "appointments" || recordType === "pending") && (
                      <div className="record-detail-row"><span>Patient email</span><strong>{viewingRecord.patientEmail || "-"}</strong></div>
                    )}
                    <div className="record-detail-row"><span>Doctor</span><strong>{viewingRecord.doctorName || "-"}</strong></div>
                    <div className="record-detail-row"><span>Date and time</span><strong>{formatAppointmentDate(viewingRecord.appointmentDate || viewingRecord.time)}</strong></div>
                    <div className="record-detail-row"><span>Reason</span><strong>{viewingRecord.reason || "-"}</strong></div>
                    <div className="record-detail-row"><span>Status</span><strong>{viewingRecord.status || "-"}</strong></div>
                    {(recordType === "appointments" || recordType === "pending") && String(viewingRecord.status || "").toUpperCase() === "PENDING" && (
                      <p className="appointment-review-note">Pending doctor review. The assigned doctor confirms the appointment.</p>
                    )}
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
            ) : (recordType === "appointments" || recordType === "pending") && appointmentListLoading ? (
              <p>Loading appointments...</p>
            ) : (recordType === "appointments" || recordType === "pending") && appointmentListError ? (
              <div className="auth-error" role="alert">{appointmentListError}</div>
            ) : records.length === 0 ? (
              <>
              {approvalError && <div className="auth-error" role="alert">{approvalError}</div>}
              <p>
                {recordType === "doctor-approvals"
                  ? "There are no doctor applications awaiting review."
                  : recordType === "pending"
                  ? "There are no appointments waiting for doctor confirmation."
                  : `No ${recordType} found.`}
              </p>
              </>
            ) : (
              <div className="record-modal-list">
                {records.map((record, index) => (
                  <div className="record-modal-item" key={record.appointmentId || record.patientCode || record.doctorCode || record.id || index}>
                    <strong>{recordType === "appointments" || recordType === "pending" || recordType === "today"
                      ? record.patientName || "Unnamed patient"
                      : record.name || record.fullName || record.patientName || record.doctorName || record.user?.fullName || "Unnamed"}</strong>
                    <span>{recordType === "appointments" || recordType === "pending" || recordType === "today"
                      ? formatAppointmentDate(record.appointmentDate || record.time)
                      : record.time || record.patientCode || record.doctorCode || record.email || record.user?.email || `Doctor ID: ${record.id || "-"}`}</span>
                    <span>{recordType === "appointments" || recordType === "pending"
                      ? `${record.doctorName || "Doctor"} · ${record.status || "PENDING"}`
                      : recordType === "today"
                        ? `${record.doctorName || "Doctor"} · ${record.status || "PENDING"}`
                      : record.specialization || record.status || record.gender || record.registeredOn || "-"}</span>
                    <button className="record-view-button" type="button" aria-label={`View details for ${record.patientName || record.name || record.fullName || record.user?.fullName || "record"}`} title="View details" onClick={() => setViewingRecord(record)}>
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="2.5" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {showBookAppointment && (
        <div className="modal-backdrop" role="presentation" onClick={() => !appointmentSaving && setShowBookAppointment(false)}>
          <section className="record-modal" role="dialog" aria-modal="true" aria-labelledby="book-appointment-title" onClick={(event) => event.stopPropagation()}>
            <div className="record-modal-head">
              <h2 id="book-appointment-title">Book an appointment</h2>
              <button className="modal-close" type="button" aria-label="Close appointment form" disabled={appointmentSaving} onClick={() => setShowBookAppointment(false)}>×</button>
            </div>
            <p>Book for an existing patient or create a patient account and book in one step.</p>
            {appointmentError && <div className="auth-error" role="alert">{appointmentError}</div>}
            {approvedDoctors.length === 0 && (
              <div className="auth-error" role="alert">No approved doctors are available for booking.</div>
            )}
            <form className="record-form" onSubmit={handleBookAppointment}>
              <label htmlFor="appointment-patient-type">Patient account</label>
              <select id="appointment-patient-type" name="patientType" value={appointmentForm.patientType} onChange={handleAppointmentChange}>
                <option value="existing">Existing patient</option>
                <option value="new">Register a new patient</option>
              </select>

              <label htmlFor="appointment-patient-email">Patient email</label>
              <input
                id="appointment-patient-email"
                type="email"
                name="patientEmail"
                value={appointmentForm.patientEmail}
                onChange={handleAppointmentChange}
                autoComplete="email"
                required
              />

              {appointmentForm.patientType === "new" && (
                <>
                  <label htmlFor="appointment-patient-name">Patient full name</label>
                  <input
                    id="appointment-patient-name"
                    name="fullName"
                    value={appointmentForm.fullName}
                    onChange={handleAppointmentChange}
                    maxLength={120}
                    autoComplete="name"
                    required
                  />
                  <label htmlFor="appointment-patient-password">Temporary password</label>
                  <input
                    id="appointment-patient-password"
                    type="password"
                    name="password"
                    value={appointmentForm.password}
                    onChange={handleAppointmentChange}
                    minLength={6}
                    maxLength={100}
                    autoComplete="new-password"
                    required
                  />
                  <p>The new patient will need to change this password when they first sign in.</p>
                </>
              )}

              <label htmlFor="appointment-doctor">Doctor</label>
              <select id="appointment-doctor" name="doctorId" value={appointmentForm.doctorId} onChange={handleAppointmentChange} required>
                <option value="" disabled>Select an approved doctor</option>
                {approvedDoctors.map((doctor) => {
                  const doctorId = doctor.id || doctor.doctorId;
                  return (
                    <option key={doctorId} value={doctorId}>
                      {doctor.user?.fullName || doctor.fullName || doctor.name || "Doctor"}
                      {doctor.specialization ? ` — ${doctor.specialization}` : ""}
                    </option>
                  );
                })}
              </select>

              <label htmlFor="appointment-date-time">Date and time</label>
              <input
                id="appointment-date-time"
                type="datetime-local"
                name="appointmentDate"
                min={toLocalDateTimeValue(new Date())}
                value={appointmentForm.appointmentDate}
                onChange={handleAppointmentChange}
                required
              />

              <label htmlFor="appointment-reason">Reason for visit (optional)</label>
              <textarea
                id="appointment-reason"
                name="reason"
                rows="3"
                maxLength={255}
                value={appointmentForm.reason}
                onChange={handleAppointmentChange}
              />

              <button className="confirm-btn" type="submit" disabled={appointmentSaving || approvedDoctors.length === 0}>
                {appointmentSaving ? "Booking..." : "Book appointment"}
              </button>
            </form>
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

      {showAddLabStaff && (
        <div className="modal-backdrop" role="presentation" onClick={() => !labStaffSaving && setShowAddLabStaff(false)}>
          <section className="record-modal" role="dialog" aria-modal="true" aria-labelledby="add-lab-staff-title" onClick={(event) => event.stopPropagation()}>
            <div className="record-modal-head">
              <h2 id="add-lab-staff-title">Add lab technical staff</h2>
              <button className="modal-close" type="button" aria-label="Close add lab staff form" disabled={labStaffSaving} onClick={() => setShowAddLabStaff(false)}>×</button>
            </div>
            <p>Create a lab staff sign-in account. The staff member will be asked to change the temporary password after signing in.</p>
            {labStaffError && <div className="auth-error" role="alert">{labStaffError}</div>}
            <form className="record-form" onSubmit={handleAddLabStaff}>
              <label htmlFor="lab-staff-full-name">Full name</label>
              <input id="lab-staff-full-name" name="fullName" value={labStaffForm.fullName} onChange={handleLabStaffChange} maxLength={120} autoComplete="name" required />

              <label htmlFor="lab-staff-email">Email</label>
              <input id="lab-staff-email" type="email" name="email" value={labStaffForm.email} onChange={handleLabStaffChange} maxLength={150} autoComplete="email" required />

              <label htmlFor="lab-staff-password">Temporary password</label>
              <input id="lab-staff-password" type="password" name="password" value={labStaffForm.password} onChange={handleLabStaffChange} minLength={6} maxLength={100} autoComplete="new-password" required />

              <button className="confirm-btn" type="submit" disabled={labStaffSaving}>
                {labStaffSaving ? "Creating account..." : "Create lab staff account"}
              </button>
            </form>
          </section>
        </div>
      )}

      <AppFooter />
    </div>
  );
}