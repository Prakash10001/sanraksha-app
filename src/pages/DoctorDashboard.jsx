import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axiosClient from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";
import Header from "../components/Header.jsx";
import SiteFooter from "../components/SiteFooter.jsx";
import {
  DOSAGE_OPTIONS,
  DURATION_OPTIONS,
  FREQUENCY_OPTIONS,
  INSTRUCTION_OPTIONS,
  MEDICINE_OPTIONS,
} from "../utils/prescriptionCatalog.js";

const STATUS_STYLES = {
  CONFIRMED: "status-dot confirmed",
  PENDING: "status-dot pending",
  CANCELLED: "status-dot cancelled",
  COMPLETED: "status-dot completed",
};

function getAppointmentList(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];

  for (const key of ["appointments", "doctorAppointments", "pendingAppointments", "items", "content", "results", "data"]) {
    const records = getAppointmentList(payload[key]);
    if (records.length > 0) return records;
  }

  if (payload.id || payload.appointmentId || payload.appointment_id || payload.patientName || payload.patient) {
    return [payload];
  }

  return [];
}

function normalizeAppointments(data) {
  const items = getAppointmentList(data);

  return items.map((item, index) => {
    const appointmentId = item.id || item.appointmentId || item.appointment_id || item._id || index;
    const status = String(item.status || item.appointmentStatus || item.state || "PENDING").toUpperCase();
    const patientName = item.patientName || item.patient?.fullName || item.patient?.user?.fullName || item.name || "Unknown patient";
    const patientEmail = item.patientEmail || item.patient?.email || item.patient?.user?.email || "—";
    const patientPhone = item.patientPhone || item.patient?.phone || item.phone || item.patient?.mobile || "—";
    const appointmentDate = item.appointmentDate || item.date || item.slot || item.time || item.appointment_time || item.dateTime || item.startTime;
    const reason = item.reason || item.notes || item.visitReason || "General consultation";
    const doctor = item.doctor || item.assignedDoctor || item.provider || {};
    const doctorName = item.doctorName || item.assignedDoctorName || item.doctorFullName || item.doctorUsername || (typeof doctor === "string" ? doctor : "") || doctor.user?.fullName || doctor.user?.username || doctor.fullName || doctor.name || doctor.username || "Doctor";
    const doctorEmail = item.doctorEmail || item.assignedDoctorEmail || doctor.email || doctor.user?.email || "";
    const doctorId = item.doctorId || item.assignedDoctorId || doctor.id || doctor.doctorId || "";
    const patientId = item.patientId || item.patient_id || item.patient?.id || item.patient?.patientId || "";
    const patient = item.patient || {};
    const medicalHistory = patient.medicalHistory || patient.medicalRecord || {};
    const allergies = item.allergies || patient.allergies || medicalHistory.allergies || [];

    return {
      id: appointmentId,
      patientId,
      allergies,
      status,
      patientName,
      patientEmail,
      patientPhone,
      appointmentDate,
      reason,
      doctorName,
      doctorEmail,
      doctorId,
    };
  });
}

function belongsToDoctor(appointment, user) {
  const currentName = String(user?.fullName || user?.username || "").trim().toLowerCase().replace(/^dr\.?\s*/, "");
  const assignedName = String(appointment.doctorName || "").trim().toLowerCase().replace(/^dr\.?\s*/, "");
  const nameMatches = currentName && assignedName === currentName;
  const emailMatches = user?.email && appointment.doctorEmail && appointment.doctorEmail.toLowerCase() === user.email.toLowerCase();
  const idMatches = user?.id && appointment.doctorId && String(appointment.doctorId) === String(user.id);

  return Boolean(nameMatches || emailMatches || idMatches);
}

export default function DoctorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [approvalStatus, setApprovalStatus] = useState(null);
  const [approvalError, setApprovalError] = useState("");
  const [appointments, setAppointments] = useState([]);
  const [doctorPatients, setDoctorPatients] = useState([]);
  const [doctorPatientsLoading, setDoctorPatientsLoading] = useState(false);
  const [doctorPatientsError, setDoctorPatientsError] = useState("");
  const [selectedAppointmentIndex, setSelectedAppointmentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [queueMessage, setQueueMessage] = useState("");
  const [confirmingId, setConfirmingId] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [prescriptions, setPrescriptions] = useState([]);
  const [prescriptionsLoading, setPrescriptionsLoading] = useState(false);
  const [prescriptionsError, setPrescriptionsError] = useState("");
  const [labReports, setLabReports] = useState([]);
  const [labReportsLoading, setLabReportsLoading] = useState(false);
  const [labReportsError, setLabReportsError] = useState("");
  const [prescriptionFormOpen, setPrescriptionFormOpen] = useState(false);
  const [prescriptionMedicines, setPrescriptionMedicines] = useState([
    { name: "", dosage: "", frequency: "", duration: "", instructions: "" },
  ]);
  const [prescriptionError, setPrescriptionError] = useState("");
  const [prescriptionSuccess, setPrescriptionSuccess] = useState("");
  const [submittingPrescription, setSubmittingPrescription] = useState(false);
  const [medicalRecordFormOpen, setMedicalRecordFormOpen] = useState(false);
  const [medicalRecordForm, setMedicalRecordForm] = useState({
    diagnosis: "",
    bloodPressureSystolic: "",
    bloodPressureDiastolic: "",
    heartRateBpm: "",
    temperatureCelsius: "",
    weightKg: "",
    oxygenSaturationPercent: "",
    notes: "",
  });
  const [medicalRecordError, setMedicalRecordError] = useState("");
  const [medicalRecordSuccess, setMedicalRecordSuccess] = useState("");
  const [submittingMedicalRecord, setSubmittingMedicalRecord] = useState(false);

  const initials = (user?.fullName || "Doctor")
    .split(" ")
    .map((namePart) => namePart[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const selectedAppointment = useMemo(
    () => appointments[selectedAppointmentIndex] || appointments[0] || null,
    [appointments, selectedAppointmentIndex]
  );
  const selectedAppointmentPrescriptions = useMemo(
    () => prescriptions.filter((prescription) => String(prescription.appointmentId) === String(selectedAppointment?.id)),
    [prescriptions, selectedAppointment?.id]
  );
  const selectedPatientAppointments = useMemo(() => {
    if (!selectedAppointment?.patientId) return [];
    return appointments
      .filter((appointment) => String(appointment.patientId) === String(selectedAppointment.patientId))
      .sort((first, second) => new Date(second.appointmentDate || 0) - new Date(first.appointmentDate || 0));
  }, [appointments, selectedAppointment?.patientId]);
  const selectedPatientPrescriptions = useMemo(
    () => prescriptions.filter((prescription) => String(prescription.patientId) === String(selectedAppointment?.patientId)),
    [prescriptions, selectedAppointment?.patientId]
  );
  const selectedPatientLabReports = useMemo(
    () => labReports.filter((report) => String(report.patientId || report.patient?.id) === String(selectedAppointment?.patientId)),
    [labReports, selectedAppointment?.patientId]
  );
  const selectedDoctorPatient = useMemo(
    () => doctorPatients.find((patient) => String(patient.patientId) === String(selectedAppointment?.patientId)),
    [doctorPatients, selectedAppointment?.patientId]
  );
  const selectedPatientAllergies = useMemo(() => {
    const value = selectedDoctorPatient?.reportedAllergies || selectedAppointment?.allergies;
    if (Array.isArray(value)) return value.map((allergy) => typeof allergy === "string" ? allergy : allergy?.name || allergy?.allergen).filter(Boolean);
    if (typeof value === "string" && value.trim()) return value.split(/[,;]/).map((allergy) => allergy.trim()).filter(Boolean);
    return [];
  }, [selectedAppointment?.allergies, selectedDoctorPatient?.reportedAllergies]);
  const reportsReadyToPublish = useMemo(
    () => labReports.filter((report) => String(report.status || report.reportStatus || "").toUpperCase() === "READY_FOR_REVIEW").length,
    [labReports]
  );
  const pendingAppointmentsCount = appointments.filter((appointment) => appointment.status === "PENDING").length;
  const confirmedAppointmentsCount = appointments.filter((appointment) => appointment.status === "CONFIRMED").length;

  useEffect(() => {
    setPrescriptionFormOpen(false);
    setPrescriptionError("");
    setPrescriptionSuccess("");
    setMedicalRecordFormOpen(false);
    setMedicalRecordError("");
    setMedicalRecordSuccess("");
    setMedicalRecordForm({
      diagnosis: "",
      bloodPressureSystolic: "",
      bloodPressureDiastolic: "",
      heartRateBpm: "",
      temperatureCelsius: "",
      weightKg: "",
      oxygenSaturationPercent: "",
      notes: "",
    });
  }, [selectedAppointment?.id]);

  useEffect(() => {
    let ignore = false;
    axiosClient.get("/doctors/me/profile")
      .then(({ data }) => {
        const profile = data?.doctor || data?.profile || data?.data || data || {};
        const status = String(profile.approvalStatus || profile.status || "PENDING_REVIEW").toUpperCase();
        if (!ignore) {
          setApprovalStatus(status);
          if (status !== "APPROVED") navigate("/doctor-profile", { replace: true });
        }
      })
      .catch((error) => {
        if (ignore) return;
        if (error?.response?.status === 404) {
          navigate("/doctor-profile", { replace: true });
          return;
        }
        setApprovalStatus("ERROR");
        setApprovalError(error?.response?.data?.message || error?.response?.data?.error || "Unable to verify your profile status.");
      });

    return () => {
      ignore = true;
    };
  }, [navigate]);

  useEffect(() => {
    if (approvalStatus !== "APPROVED") return undefined;
    let ignore = false;
    setDoctorPatientsLoading(true);
    setDoctorPatientsError("");
    axiosClient.get("/doctors/me/patients")
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : data?.patients || data?.items || data?.content || data?.data || [];
        if (!ignore) setDoctorPatients(Array.isArray(list) ? list : []);
      })
      .catch((error) => {
        if (!ignore) {
          setDoctorPatients([]);
          setDoctorPatientsError(error?.response?.data?.message || error?.response?.data?.error || "Unable to load patient-reported health information.");
        }
      })
      .finally(() => {
        if (!ignore) setDoctorPatientsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [approvalStatus]);

  useEffect(() => {
    let ignore = false;

    async function loadAppointments() {
      if (approvalStatus !== "APPROVED") return;

      const candidateEndpoints = [
        "/appointments/doctor/me",
        "/appointments/doctor",
        "/doctor/appointments",
        "/appointments",
        "/admin/pending-appointments",
        "/admin/appointments",
      ];
      const doctorScopedEndpoints = new Set([
        "/appointments/doctor/me",
        "/appointments/doctor",
        "/doctor/appointments",
      ]);
      const endpointErrors = [];
      let receivedUnmatchedAppointments = false;

      for (const endpoint of candidateEndpoints) {
        try {
          const response = await axiosClient.get(endpoint);
          const list = normalizeAppointments(response.data);
          if (list.length === 0) continue;

          const finalList = doctorScopedEndpoints.has(endpoint)
            ? list
            : list.filter((appointment) => belongsToDoctor(appointment, user));
          if (finalList.length === 0) {
            receivedUnmatchedAppointments = true;
            continue;
          }
          if (!ignore) {
            setAppointments(finalList);
            setQueueMessage("");
            setLastUpdated(new Date());
            setLoading(false);
          }
          return;
        } catch (error) {
          endpointErrors.push(`${endpoint}: ${error?.response?.status || error.message || "request failed"}`);
        }
      }

      if (!ignore) {
        setAppointments([]);
        setQueueMessage(receivedUnmatchedAppointments
          ? "Appointments were returned, but none could be matched to this doctor. Check the assigned doctor name or ID in the appointment record."
          : endpointErrors.length === candidateEndpoints.length
            ? `Unable to load appointments. Backend responses: ${endpointErrors.join("; ")}`
            : "No appointments were returned for this doctor.");
        setLastUpdated(new Date());
        setLoading(false);
      }
    }

    setLoading(true);
    loadAppointments();
    const refreshTimer = setInterval(() => {
      loadAppointments();
    }, 15000);

    return () => {
      ignore = true;
      clearInterval(refreshTimer);
    };
  }, [user?.fullName, user?.email, approvalStatus]);

  useEffect(() => {
    if (approvalStatus !== "APPROVED") return undefined;

    let ignore = false;
    setPrescriptionsLoading(true);
    setPrescriptionsError("");
    axiosClient.get("/prescriptions/doctor/me")
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : data?.prescriptions || data?.items || data?.content || data?.data || [];
        if (!ignore) setPrescriptions(Array.isArray(list) ? list : []);
      })
      .catch((error) => {
        if (!ignore) {
          setPrescriptions([]);
          setPrescriptionsError(error?.response?.data?.message || "Unable to load prescriptions for your patients.");
        }
      })
      .finally(() => {
        if (!ignore) setPrescriptionsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [approvalStatus]);

  useEffect(() => {
    if (approvalStatus !== "APPROVED") return undefined;

    let ignore = false;
    setLabReportsLoading(true);
    setLabReportsError("");
    axiosClient.get("/lab-reports")
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : data?.reports || data?.labReports || data?.items || data?.content || data?.data || [];
        if (!ignore) setLabReports(Array.isArray(list) ? list : []);
      })
      .catch((error) => {
        if (!ignore) {
          setLabReports([]);
          setLabReportsError(error?.response?.data?.message || "Unable to load patient lab history.");
        }
      })
      .finally(() => {
        if (!ignore) setLabReportsLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [approvalStatus]);

  useEffect(() => {
    if (approvalStatus !== "APPROVED") return undefined;
    let ignore = false;
    const refreshTimer = window.setInterval(() => {
      axiosClient.get("/lab-reports")
        .then(({ data }) => {
          const list = Array.isArray(data) ? data : data?.reports || data?.labReports || data?.items || data?.content || data?.data || [];
          if (!ignore) {
            setLabReports(Array.isArray(list) ? list : []);
            setLabReportsError("");
          }
        })
        .catch((error) => {
          if (!ignore) {
            setLabReportsError(error?.response?.data?.message || "Unable to refresh lab report notifications.");
          }
        });
    }, 30000);

    return () => {
      ignore = true;
      window.clearInterval(refreshTimer);
    };
  }, [approvalStatus]);

  async function handleCreatePrescription(event) {
    event.preventDefault();
    if (selectedAppointment?.status !== "CONFIRMED") {
      setPrescriptionError("The appointment must be confirmed before writing a prescription.");
      return;
    }
    if (!selectedAppointment?.patientId) {
      setPrescriptionError("This appointment does not include a patient ID. Please refresh or contact support.");
      return;
    }
    if (prescriptionMedicines.some((medicine) => !medicine.name.trim() || !medicine.dosage.trim() || !medicine.frequency.trim() || !medicine.duration.trim())) {
      setPrescriptionError("Enter the medicine, dosage, frequency, and duration for every medicine.");
      return;
    }

    setSubmittingPrescription(true);
    setPrescriptionError("");
    setPrescriptionSuccess("");
    try {
      const { data } = await axiosClient.post("/prescriptions", {
        patientId: selectedAppointment.patientId,
        appointmentId: selectedAppointment.id,
        notes: "",
        medicines: prescriptionMedicines,
      });
      setPrescriptions((current) => [data, ...current]);
      setPrescriptionFormOpen(false);
      setPrescriptionMedicines([{ name: "", dosage: "", frequency: "", duration: "", instructions: "" }]);
      setPrescriptionSuccess(`Prescription shared with ${selectedAppointment.patientName}.`);
    } catch (error) {
      setPrescriptionError(error?.response?.data?.message || "Unable to save this prescription. Please try again.");
    } finally {
      setSubmittingPrescription(false);
    }
  }

  async function handleCreateMedicalRecord(event) {
    event.preventDefault();
    if (selectedAppointment?.status !== "CONFIRMED") {
      setMedicalRecordError("The appointment must be confirmed before recording visit details.");
      return;
    }
    if (!selectedAppointment?.patientId) {
      setMedicalRecordError("This appointment does not include a patient ID. Please refresh or contact support.");
      return;
    }
    if (Boolean(medicalRecordForm.bloodPressureSystolic) !== Boolean(medicalRecordForm.bloodPressureDiastolic)) {
      setMedicalRecordError("Enter both systolic and diastolic blood pressure values, or leave both blank.");
      return;
    }

    const numericFields = [
      "bloodPressureSystolic",
      "bloodPressureDiastolic",
      "heartRateBpm",
      "temperatureCelsius",
      "weightKg",
      "oxygenSaturationPercent",
    ];
    const payload = {
      patientId: Number(selectedAppointment.patientId),
      diagnosis: medicalRecordForm.diagnosis.trim() || null,
      notes: medicalRecordForm.notes.trim() || null,
    };
    numericFields.forEach((field) => {
      payload[field] = medicalRecordForm[field] === "" ? null : Number(medicalRecordForm[field]);
    });

    setSubmittingMedicalRecord(true);
    setMedicalRecordError("");
    setMedicalRecordSuccess("");
    try {
      await axiosClient.post("/records", payload);
      setMedicalRecordSuccess(`Visit details recorded for ${selectedAppointment.patientName}.`);
      setMedicalRecordFormOpen(false);
      setMedicalRecordForm({
        diagnosis: "",
        bloodPressureSystolic: "",
        bloodPressureDiastolic: "",
        heartRateBpm: "",
        temperatureCelsius: "",
        weightKg: "",
        oxygenSaturationPercent: "",
        notes: "",
      });
    } catch (error) {
      setMedicalRecordError(error?.response?.data?.message || error?.response?.data?.error || "Unable to save these visit details.");
    } finally {
      setSubmittingMedicalRecord(false);
    }
  }

  async function handleConfirmAppointment(appointmentId) {
    const appointment = appointments.find((item) => item.id === appointmentId);
    if (!appointment || appointment.status === "CANCELLED" || appointment.status === "CONFIRMED") return;

    setConfirmingId(appointmentId);

    try {
      await axiosClient.put(`/appointments/${appointmentId}/status`, null, {
        params: { status: "CONFIRMED" },
      });
    } catch {
      window.alert("Unable to confirm this appointment. Please check the backend endpoint or contact support.");
      setConfirmingId(null);
      return;
    }

    setAppointments((current) =>
      current.map((item) =>
        item.id === appointmentId ? { ...item, status: "CONFIRMED" } : item
      )
    );
    setConfirmingId(null);
  }

  if (approvalStatus !== "APPROVED") {
    return (
      <>
        <Header navLinks={[]} user={{ initials, name: user?.fullName || "Doctor", role: "Doctor" }} />
        <main className="page narrow">
          <section className="panel approval-message">
            <h2>{approvalStatus === "ERROR" ? "Unable to check profile status" : "Checking profile approval"}</h2>
            <p>{approvalError || "Your appointment dashboard is available after administrator approval."}</p>
            <Link className="btn-primary" to="/doctor-profile">Open doctor profile</Link>
          </section>
        </main>
        <SiteFooter />
      </>
    );
  }

  return (
    <>
      <Header
        navLinks={[
          { label: "Dashboard", to: "/doctor-dashboard" },
          {
            label: "Lab reports",
            to: "/lab-reports",
            badge: reportsReadyToPublish,
            badgeLabel: "reports ready to publish",
          },
        ]}
        user={{ initials, name: user?.fullName || "Doctor", role: "Doctor" }}
      />
      <div className="page doctor-dashboard-page">
        <section className="doctor-welcome-hero">
          <div className="doctor-welcome-copy">
            <span className="doctor-hero-kicker">CLINICAL WORKSPACE</span>
            <h1>Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 18 ? "afternoon" : "evening"}, Dr. {user?.fullName || "Doctor"}</h1>
            <p>Your patient care, appointments, and clinical updates — all in one place.</p>
            <div className="doctor-live-status">
              <span className="doctor-live-pulse" aria-hidden="true" />
              <span>Live queue</span>
              <span className="doctor-live-divider" />
              <span>Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          </div>
          <div className="doctor-hero-art" aria-hidden="true">
            <div className="doctor-hero-orbit doctor-hero-orbit-one" />
            <div className="doctor-hero-orbit doctor-hero-orbit-two" />
            <div className="doctor-hero-medallion">
              <svg viewBox="0 0 48 48" role="presentation">
                <path d="M24 5v38M5 24h38" />
                <circle cx="24" cy="24" r="20" />
              </svg>
            </div>
            <span className="doctor-hero-spark doctor-hero-spark-one" />
            <span className="doctor-hero-spark doctor-hero-spark-two" />
          </div>
        </section>

        <section className="doctor-metric-grid" aria-label="Dashboard overview">
          <article className="doctor-metric-card">
            <span className="doctor-metric-icon queue-icon" aria-hidden="true">↗</span>
            <span className="doctor-metric-label">Appointments in queue</span>
            <strong>{loading ? "—" : appointments.length}</strong>
            <small>Assigned to your care</small>
          </article>
          <article className="doctor-metric-card">
            <span className="doctor-metric-icon pending-icon" aria-hidden="true">◷</span>
            <span className="doctor-metric-label">Awaiting confirmation</span>
            <strong>{loading ? "—" : pendingAppointmentsCount}</strong>
            <small>Needs your attention</small>
          </article>
          <article className="doctor-metric-card">
            <span className="doctor-metric-icon confirmed-icon" aria-hidden="true">✓</span>
            <span className="doctor-metric-label">Confirmed visits</span>
            <strong>{loading ? "—" : confirmedAppointmentsCount}</strong>
            <small>Ready for consultation</small>
          </article>
          <article className="doctor-metric-card">
            <span className="doctor-metric-icon reports-icon" aria-hidden="true">▤</span>
            <span className="doctor-metric-label">Reports to review</span>
            <strong>{reportsReadyToPublish}</strong>
            <small><Link to="/lab-reports">Open lab reports <span aria-hidden="true">→</span></Link></small>
          </article>
        </section>

        {loading ? (
          <div className="doctor-dashboard-loading" role="status">Preparing your patient workspace…</div>
        ) : appointments.length === 0 ? (
          <div className="panel doctor-empty-state">
            <div className="doctor-empty-icon" aria-hidden="true">✓</div>
            <div>
              <span className="doctor-hero-kicker">YOUR WORKSPACE IS READY</span>
              <h2>No appointments scheduled</h2>
              <p>{queueMessage || "There are no patient appointments assigned to this doctor yet."}</p>
            </div>
          </div>
        ) : (
          <div className="doctor-queue">
            <div className="doctor-workspace-heading">
              <div>
                <span className="doctor-hero-kicker">PATIENT CARE</span>
                <h2>Today’s workspace</h2>
              </div>
              <span className="doctor-workspace-count">{appointments.length} {appointments.length === 1 ? "patient" : "patients"}</span>
            </div>
            <div className="grid-2">
              <div className="panel doctor-detail-panel">
                <div className="doctor-appointment-slider-head">
                  <h2>Appointment details</h2>
                  {appointments.length > 1 && (
                    <div className="doctor-appointment-slider-controls" aria-label="Appointment navigation">
                      <button
                        type="button"
                        aria-label="Previous appointment"
                        title="Previous appointment"
                        disabled={selectedAppointmentIndex === 0}
                        onClick={() => setSelectedAppointmentIndex((index) => Math.max(0, index - 1))}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="m14.5 5-7 7 7 7" />
                        </svg>
                      </button>
                      <span>{selectedAppointmentIndex + 1} / {appointments.length}</span>
                      <button
                        type="button"
                        aria-label="Next appointment"
                        title="Next appointment"
                        disabled={selectedAppointmentIndex >= appointments.length - 1}
                        onClick={() => setSelectedAppointmentIndex((index) => Math.min(appointments.length - 1, index + 1))}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="m9.5 5 7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
                {selectedAppointment && (
                  <div className="record-details">
                    <div className="record-detail-row"><span>Patient</span><strong>{selectedAppointment.patientName}</strong></div>
                    <div className="record-detail-row"><span>Email</span><strong>{selectedAppointment.patientEmail}</strong></div>
                    <div className="record-detail-row"><span>Phone</span><strong>{selectedAppointment.patientPhone}</strong></div>
                    <div className="record-detail-row"><span>Appointment</span><strong>{selectedAppointment.appointmentDate ? new Date(selectedAppointment.appointmentDate).toLocaleString() : "To be scheduled"}</strong></div>
                    <div className="record-detail-row"><span>Reason</span><strong>{selectedAppointment.reason}</strong></div>
                    <div className="record-detail-row"><span>Status</span><strong>{selectedAppointment.status}</strong></div>
                    <section className={`patient-allergy-alert ${selectedPatientAllergies.length ? "has-allergies" : ""}`} aria-label="Patient allergy information">
                      <strong>{selectedPatientAllergies.length ? "Patient-reported allergies" : "Allergy information"}</strong>
                      <p>
                        {selectedPatientAllergies.length
                          ? selectedPatientAllergies.join(", ")
                          : doctorPatientsLoading
                            ? "Loading the patient's reported information..."
                            : doctorPatientsError
                              ? doctorPatientsError
                              : "No allergies have been reported. Confirm allergies with the patient before prescribing."}
                      </p>
                      <strong>Patient-reported conditions</strong>
                      <p>
                        {selectedDoctorPatient?.reportedConditions || (doctorPatientsLoading
                          ? "Loading the patient's reported information..."
                          : doctorPatientsError
                            ? doctorPatientsError
                            : "No conditions have been reported. Confirm relevant history with the patient.")}
                      </p>
                      {selectedDoctorPatient?.healthInfoUpdatedAt && (
                        <small>Patient information updated {new Date(selectedDoctorPatient.healthInfoUpdatedAt).toLocaleString()}</small>
                      )}
                    </section>
                    <section className="patient-history">
                      <h3>Patient history</h3>
                      <div className="patient-history-group">
                        <strong>Visits</strong>
                        {selectedPatientAppointments.length ? selectedPatientAppointments.slice(0, 5).map((appointment) => (
                          <div className="patient-history-entry" key={appointment.id}>
                            <span>{appointment.appointmentDate ? new Date(appointment.appointmentDate).toLocaleString() : "Date not provided"}</span>
                            <small>{appointment.reason} · {appointment.status}</small>
                          </div>
                        )) : <p>No visit history is available.</p>}
                      </div>
                      <div className="patient-history-group">
                        <strong>Prescriptions</strong>
                        {prescriptionsLoading ? (
                          <p>Loading prescription history...</p>
                        ) : prescriptionsError ? (
                          <p role="alert">{prescriptionsError}</p>
                        ) : selectedPatientPrescriptions.length ? selectedPatientPrescriptions.slice(0, 5).map((prescription) => (
                          <div className="patient-history-entry" key={prescription.id}>
                            <span>{prescription.prescribedAt ? new Date(prescription.prescribedAt).toLocaleDateString() : "Date not provided"}</span>
                            <small>{prescription.medicines?.map((medicine) => `${medicine.name} (${medicine.dosage}, ${medicine.frequency})`).join("; ") || "Medicine details unavailable"}</small>
                          </div>
                        )) : <p>No prior prescriptions are available.</p>}
                      </div>
                      <div className="patient-history-group">
                        <strong>Lab reports</strong>
                        {labReportsLoading ? (
                          <p>Loading lab history...</p>
                        ) : labReportsError ? (
                          <p role="alert">{labReportsError}</p>
                        ) : selectedPatientLabReports.length ? selectedPatientLabReports.slice(0, 5).map((report) => (
                          <div className="patient-history-entry" key={report.id || report.reportId}>
                            <span>{report.testName || report.name || "Lab report"}</span>
                            <small>{[report.orderedAt && new Date(report.orderedAt).toLocaleDateString(), report.status, report.notes].filter(Boolean).join(" · ")}</small>
                          </div>
                        )) : <p>No lab reports are available.</p>}
                      </div>
                    </section>
                    <div className="prescription-history">
                      <strong>Prescriptions for this visit</strong>
                      {prescriptionsLoading ? (
                        <p>Loading prescriptions...</p>
                      ) : prescriptionsError ? (
                        <p role="alert">{prescriptionsError}</p>
                      ) : selectedAppointmentPrescriptions.length === 0 ? (
                        <p>No prescriptions have been written for this visit.</p>
                      ) : selectedAppointmentPrescriptions.map((prescription) => (
                        <div className="prescription-history-item" key={prescription.id}>
                          <span>{prescription.prescribedAt ? new Date(prescription.prescribedAt).toLocaleDateString() : "Date not provided"}</span>
                          {prescription.medicines?.map((medicine, index) => (
                            <p key={`${prescription.id}-${index}`}>
                              <strong>{medicine.name}</strong> · {medicine.dosage} · {medicine.frequency} · {medicine.duration}
                              {medicine.instructions ? ` · ${medicine.instructions}` : ""}
                            </p>
                          ))}
                          {prescription.notes && <small>{prescription.notes}</small>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="panel actions-panel doctor-action-panel">
                <span className="doctor-hero-kicker">CARE TOOLS</span>
                <h2>Quick actions</h2>
                {selectedAppointment && selectedAppointment.status !== "CONFIRMED" && selectedAppointment.status !== "CANCELLED" && (
                  <button
                    type="button"
                    className="doctor-confirm-btn"
                    onClick={() => handleConfirmAppointment(selectedAppointment.id)}
                    disabled={confirmingId === selectedAppointment.id}
                    style={{ width: "100%" }}
                  >
                    {confirmingId === selectedAppointment.id ? "Confirming..." : "Confirm patient appointment"}
                  </button>
                )}
                {selectedAppointment && selectedAppointment.status === "CONFIRMED" && (
                  <span className="doctor-confirmed-label">Appointment already confirmed</span>
                )}
                {selectedAppointment && selectedAppointment.status === "CANCELLED" && (
                  <span className="doctor-confirmed-label">This appointment was cancelled</span>
                )}
                {selectedAppointment && (
                  <>
                    <button
                      type="button"
                      className="doctor-confirm-btn"
                      style={{ width: "100%", marginTop: 14 }}
                      disabled={!selectedAppointment.patientId || selectedAppointment.status !== "CONFIRMED"}
                      onClick={() => {
                        setMedicalRecordFormOpen((open) => !open);
                        setMedicalRecordError("");
                        setMedicalRecordSuccess("");
                      }}
                    >
                      {medicalRecordFormOpen
                        ? "Close visit record form"
                        : selectedAppointment.status === "CONFIRMED"
                          ? "Record visit details"
                          : "Record visit details after confirmation"}
                    </button>
                    {!selectedAppointment.patientId && (
                      <p className="form-error">Patient details are missing for this appointment.</p>
                    )}
                    {medicalRecordSuccess && <p className="form-success" role="status">{medicalRecordSuccess}</p>}
                    <button
                      type="button"
                      className="doctor-confirm-btn"
                      style={{ width: "100%", marginTop: 14 }}
                      disabled={!selectedAppointment.patientId || selectedAppointment.status !== "CONFIRMED"}
                      onClick={() => {
                        setPrescriptionFormOpen((open) => !open);
                        setPrescriptionError("");
                        setPrescriptionSuccess("");
                      }}
                    >
                      {prescriptionFormOpen
                        ? "Close prescription form"
                        : selectedAppointment.status === "CONFIRMED"
                          ? "Write prescription"
                          : "Prescription available after confirmation"}
                    </button>
                    {!selectedAppointment.patientId && (
                      <p className="form-error">Patient details are missing for this appointment.</p>
                    )}
                    {prescriptionSuccess && <p className="form-success" role="status">{prescriptionSuccess}</p>}
                  </>
                )}
              </div>
            </div>

            {medicalRecordFormOpen && selectedAppointment?.status === "CONFIRMED" && (
              <section className="panel prescription-form-panel">
                <h2>Visit details for {selectedAppointment.patientName}</h2>
                <p>Enter measurements observed during this visit. Leave unmeasured values blank; this record is added to the patient's medical history.</p>
                <form className="record-form" onSubmit={handleCreateMedicalRecord}>
                  <label htmlFor="visit-diagnosis">Diagnosis or assessment (optional)</label>
                  <input
                    id="visit-diagnosis"
                    value={medicalRecordForm.diagnosis}
                    onChange={(event) => setMedicalRecordForm((current) => ({ ...current, diagnosis: event.target.value }))}
                    maxLength={255}
                    disabled={submittingMedicalRecord}
                  />
                  <div className="prescription-field-grid">
                    <label htmlFor="visit-bp-systolic">Systolic blood pressure (mmHg)
                      <input id="visit-bp-systolic" type="number" min="50" max="300" value={medicalRecordForm.bloodPressureSystolic} onChange={(event) => setMedicalRecordForm((current) => ({ ...current, bloodPressureSystolic: event.target.value }))} disabled={submittingMedicalRecord} />
                    </label>
                    <label htmlFor="visit-bp-diastolic">Diastolic blood pressure (mmHg)
                      <input id="visit-bp-diastolic" type="number" min="30" max="200" value={medicalRecordForm.bloodPressureDiastolic} onChange={(event) => setMedicalRecordForm((current) => ({ ...current, bloodPressureDiastolic: event.target.value }))} disabled={submittingMedicalRecord} />
                    </label>
                    <label htmlFor="visit-heart-rate">Heart rate (bpm)
                      <input id="visit-heart-rate" type="number" min="20" max="250" value={medicalRecordForm.heartRateBpm} onChange={(event) => setMedicalRecordForm((current) => ({ ...current, heartRateBpm: event.target.value }))} disabled={submittingMedicalRecord} />
                    </label>
                    <label htmlFor="visit-temperature">Temperature (°C)
                      <input id="visit-temperature" type="number" min="25" max="45" step="0.1" value={medicalRecordForm.temperatureCelsius} onChange={(event) => setMedicalRecordForm((current) => ({ ...current, temperatureCelsius: event.target.value }))} disabled={submittingMedicalRecord} />
                    </label>
                    <label htmlFor="visit-weight">Weight (kg)
                      <input id="visit-weight" type="number" min="0.1" max="1000" step="0.01" value={medicalRecordForm.weightKg} onChange={(event) => setMedicalRecordForm((current) => ({ ...current, weightKg: event.target.value }))} disabled={submittingMedicalRecord} />
                    </label>
                    <label htmlFor="visit-oxygen">Oxygen saturation (%)
                      <input id="visit-oxygen" type="number" min="0" max="100" value={medicalRecordForm.oxygenSaturationPercent} onChange={(event) => setMedicalRecordForm((current) => ({ ...current, oxygenSaturationPercent: event.target.value }))} disabled={submittingMedicalRecord} />
                    </label>
                  </div>
                  <label htmlFor="visit-notes">Clinical notes (optional)</label>
                  <textarea
                    id="visit-notes"
                    rows="4"
                    maxLength={5000}
                    value={medicalRecordForm.notes}
                    onChange={(event) => setMedicalRecordForm((current) => ({ ...current, notes: event.target.value }))}
                    disabled={submittingMedicalRecord}
                  />
                  {medicalRecordError && <p className="form-error" role="alert">{medicalRecordError}</p>}
                  <button className="doctor-confirm-btn" type="submit" disabled={submittingMedicalRecord}>
                    {submittingMedicalRecord ? "Saving visit details..." : "Save visit details"}
                  </button>
                </form>
              </section>
            )}

            {prescriptionFormOpen && selectedAppointment?.status === "CONFIRMED" && (
              <section className="panel prescription-form-panel">
                <h2>Prescription for {selectedAppointment.patientName}</h2>
                <p>Select each prescription detail. The catalog is a selection aid, not a treatment recommendation; verify the medicine and regimen for the patient.</p>
                <form className="record-form" onSubmit={handleCreatePrescription}>
                  {prescriptionMedicines.map((medicine, index) => (
                    <fieldset className="prescription-medicine-fields" key={index}>
                      <legend>Medicine {index + 1}</legend>
                      <label>
                        Medicine name
                        <select
                          required
                          value={medicine.name}
                          onChange={(event) => setPrescriptionMedicines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item))}
                        >
                          <option value="">Select a medicine</option>
                          {MEDICINE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                        </select>
                      </label>
                      <div className="prescription-field-grid">
                        <label>
                          Strength / dosage
                          <select
                            required
                            value={medicine.dosage}
                            onChange={(event) => setPrescriptionMedicines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, dosage: event.target.value } : item))}
                          >
                            <option value="">Select dosage</option>
                            {DOSAGE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                          </select>
                        </label>
                        <label>
                          Frequency
                          <select
                            required
                            value={medicine.frequency}
                            onChange={(event) => setPrescriptionMedicines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, frequency: event.target.value } : item))}
                          >
                            <option value="">Select frequency</option>
                            {FREQUENCY_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                          </select>
                        </label>
                        <label>
                          Duration
                          <select
                            required
                            value={medicine.duration}
                            onChange={(event) => setPrescriptionMedicines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, duration: event.target.value } : item))}
                          >
                            <option value="">Select duration</option>
                            {DURATION_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                          </select>
                        </label>
                      </div>
                      <label>
                        Instructions (optional)
                        <select
                          value={medicine.instructions}
                          onChange={(event) => setPrescriptionMedicines((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, instructions: event.target.value } : item))}
                        >
                          <option value="">Select instructions</option>
                          {INSTRUCTION_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                        </select>
                      </label>
                      {prescriptionMedicines.length > 1 && (
                        <button
                          className="portal-section-link"
                          type="button"
                          onClick={() => setPrescriptionMedicines((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                        >
                          Remove medicine
                        </button>
                      )}
                    </fieldset>
                  ))}
                  <button
                    className="quick-btn prescription-add-medicine"
                    type="button"
                    disabled={prescriptionMedicines.length >= 20}
                    onClick={() => setPrescriptionMedicines((current) => [...current, { name: "", dosage: "", frequency: "", duration: "", instructions: "" }])}
                  >
                    Add another medicine
                  </button>
                  {prescriptionError && <p className="form-error" role="alert">{prescriptionError}</p>}
                  <button className="doctor-confirm-btn" type="submit" disabled={submittingPrescription}>
                    {submittingPrescription ? "Saving prescription..." : "Save and share prescription"}
                  </button>
                </form>
              </section>
            )}

            <div className="table-panel doctor-queue-table">
              <div className="doctor-queue-table-heading">
                <div>
                  <span className="doctor-hero-kicker">SCHEDULE</span>
                  <h2>Appointment queue</h2>
                </div>
                <span>{appointments.length} total</span>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Contact</th>
                    <th>Visit</th>
                    <th>Time</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((appointment) => (
                    <tr key={appointment.id}>
                      <td>
                        <div className="patient-name-block">
                          <strong>{appointment.patientName}</strong>
                          <span>{appointment.doctorName}</span>
                        </div>
                      </td>
                      <td>
                        <div className="patient-meta-block">
                          <span>{appointment.patientEmail}</span>
                          <span>{appointment.patientPhone}</span>
                        </div>
                      </td>
                      <td>{appointment.reason}</td>
                      <td>{appointment.appointmentDate ? new Date(appointment.appointmentDate).toLocaleString() : "To be scheduled"}</td>
                      <td>
                        <span className={STATUS_STYLES[appointment.status] || "status-dot pending"}>
                          {appointment.status}
                        </span>
                      </td>
                      <td>
                        {appointment.status === "CANCELLED" ? (
                          <span className="doctor-confirmed-label">Cancelled</span>
                        ) : appointment.status === "CONFIRMED" ? (
                          <span className="doctor-confirmed-label">Confirmed</span>
                        ) : (
                          <button
                            type="button"
                            className="doctor-confirm-btn"
                            onClick={() => handleConfirmAppointment(appointment.id)}
                            disabled={confirmingId === appointment.id}
                          >
                            {confirmingId === appointment.id ? "Confirming..." : "Confirm"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      <SiteFooter />
    </>
  );
}