import { useEffect, useMemo, useState } from "react";
import axiosClient from "../api/axiosClient";
import { useAuth } from "../context/AuthContext";
import Header from "../components/Header.jsx";
import SiteFooter from "../components/SiteFooter.jsx";

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

    return {
      id: appointmentId,
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
  const [appointments, setAppointments] = useState([]);
  const [selectedAppointmentIndex, setSelectedAppointmentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [queueMessage, setQueueMessage] = useState("");
  const [confirmingId, setConfirmingId] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

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

  useEffect(() => {
    let ignore = false;

    async function loadAppointments() {
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
  }, [user?.fullName, user?.email]);

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

  return (
    <>
      <Header
        navLinks={[]}
        user={{ initials, name: user?.fullName || "Doctor", role: "Doctor" }}
      />
      <div className="page">
        <div className="page-head">
          <h1>Welcome, Dr. {user?.fullName || "Doctor"}</h1>
          <p>Here's your patient queue for today.</p>
          <p style={{ marginTop: 8, fontSize: 13, color: "var(--ink-soft)" }}>
            Live queue updates • {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : appointments.length === 0 ? (
          <div className="panel">
            <h2>No appointments scheduled</h2>
            <p>{queueMessage || "There are no patient appointments assigned to this doctor yet."}</p>
          </div>
        ) : (
          <div className="doctor-queue">
            <div className="grid-2">
              <div className="panel">
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
                        ‹
                      </button>
                      <span>{selectedAppointmentIndex + 1} / {appointments.length}</span>
                      <button
                        type="button"
                        aria-label="Next appointment"
                        title="Next appointment"
                        disabled={selectedAppointmentIndex >= appointments.length - 1}
                        onClick={() => setSelectedAppointmentIndex((index) => Math.min(appointments.length - 1, index + 1))}
                      >
                        ›
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
                  </div>
                )}
              </div>

              <div className="panel actions-panel">
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
              </div>
            </div>

            <div className="table-panel">
              <h2>Today's Queue</h2>
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