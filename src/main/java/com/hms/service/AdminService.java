package com.hms.service;

import com.hms.dto.AdminStatsResponse;
import com.hms.dto.AdminAppointmentRequest;
import com.hms.dto.AdminAppointmentResponse;
import com.hms.dto.AdminPatientResponse;
import com.hms.dto.AdminStaffResponse;
import com.hms.dto.CreateLabStaffRequest;
import com.hms.dto.LabStaffResponse;
import com.hms.dto.RecentPatientResponse;
import com.hms.dto.RegisterRequest;
import com.hms.dto.ScheduleItemResponse;
import com.hms.entity.Appointment;
import com.hms.entity.Doctor;
import com.hms.entity.DoctorApprovalStatus;
import com.hms.entity.Patient;
import com.hms.entity.Role;
import com.hms.entity.User;
import com.hms.dto.AppointmentRequest;
import com.hms.repository.AppointmentRepository;
import com.hms.repository.DoctorRepository;
import com.hms.repository.PatientRepository;
import com.hms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Comparator;
import java.util.Map;
import java.util.function.Function;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final AppointmentRepository appointmentRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthService authService;
    private final AppointmentService appointmentService;

    @Transactional
    public AdminAppointmentResponse bookAppointment(AdminAppointmentRequest request) {
        String patientEmail = request.getPatientEmail().trim().toLowerCase();
        Doctor doctor = doctorRepository.findById(request.getDoctorId())
                .orElseThrow(() -> new IllegalArgumentException("Doctor not found"));
        if (doctor.getApprovalStatus() != DoctorApprovalStatus.APPROVED) {
            throw new IllegalArgumentException("Appointments can only be booked with approved doctors");
        }

        Patient patient;
        if (request.isCreatePatient()) {
            if (request.getFullName() == null || request.getFullName().isBlank()) {
                throw new IllegalArgumentException("Full name is required for a new patient");
            }
            if (request.getPassword() == null || request.getPassword().length() < 6) {
                throw new IllegalArgumentException("Temporary password must be at least 6 characters");
            }
            if (userRepository.existsByEmailIgnoreCase(patientEmail)) {
                throw new IllegalArgumentException("An account with this email already exists");
            }

            RegisterRequest registration = new RegisterRequest();
            registration.setFullName(request.getFullName().trim());
            registration.setEmail(patientEmail);
            registration.setPassword(request.getPassword());
            registration.setRole(Role.PATIENT);
            registration.setMustResetPassword(true);
            authService.register(registration);
            patient = patientRepository.findByUser_EmailIgnoreCase(patientEmail)
                    .orElseThrow(() -> new IllegalStateException("The patient account was created but could not be loaded"));
        } else {
            patient = patientRepository.findByUser_EmailIgnoreCase(patientEmail)
                    .orElseThrow(() -> new IllegalArgumentException("No patient account was found for this email"));
        }

        AppointmentRequest appointmentRequest = new AppointmentRequest();
        appointmentRequest.setDoctorId(request.getDoctorId());
        appointmentRequest.setAppointmentDate(request.getAppointmentDate());
        appointmentRequest.setReason(request.getReason());
        Appointment appointment = appointmentService.bookForPatient(patient, appointmentRequest);
        return toAdminAppointmentResponse(appointment);
    }

    @Transactional
    public LabStaffResponse createLabStaff(CreateLabStaffRequest request) {
        String email = request.email().trim().toLowerCase();
        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("An account with this email already exists");
        }

        User user = User.builder()
                .fullName(request.fullName().trim())
                .email(email)
                .password(passwordEncoder.encode(request.password()))
                .role(Role.LAB_TECH)
                .mustResetPassword(true)
                .build();

        User savedUser = userRepository.save(user);
        return new LabStaffResponse(savedUser.getId(), savedUser.getFullName(), savedUser.getEmail(), savedUser.getRole());
    }

    public AdminStatsResponse getStats() {
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = LocalDate.now().atTime(LocalTime.MAX);

        long totalPatients = patientRepository.count();
        long patientsRegisteredToday = patientRepository.countByUser_CreatedAtBetween(startOfDay, endOfDay);
        long totalDoctors = doctorRepository.count();
        long appointmentsToday = appointmentRepository
                .findByAppointmentDateBetween(startOfDay, endOfDay).size();
        long pendingAppointments = appointmentRepository
                .countByStatus(Appointment.Status.PENDING);

        return new AdminStatsResponse(totalPatients, patientsRegisteredToday, totalDoctors, appointmentsToday, pendingAppointments);
    }

    @Transactional(readOnly = true)
    public Page<AdminPatientResponse> getPatients(int page, int size, String search) {
        PageRequest pageable = pageableSettings(page, size);
        String query = search == null ? "" : search.trim();
        Page<Patient> patientPage = query.isEmpty()
                ? patientRepository.findAll(pageable)
                : patientRepository.findByUser_FullNameContainingIgnoreCaseOrUser_EmailContainingIgnoreCase(
                        query, query, pageable);
        return patientPage.map(this::toAdminPatientResponse);
    }

    @Transactional(readOnly = true)
    public List<AdminPatientResponse> getPatientsRegisteredToday() {
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = LocalDate.now().atTime(LocalTime.MAX);
        return patientRepository.findByUser_CreatedAtBetweenOrderByUser_CreatedAtDesc(startOfDay, endOfDay)
                .stream()
                .map(this::toAdminPatientResponse)
                .toList();
    }

    private AdminPatientResponse toAdminPatientResponse(Patient patient) {
        return new AdminPatientResponse(
                patient.getId(),
                "PT-" + String.format("%05d", patient.getId()),
                patient.getUser().getFullName(),
                patient.getUser().getEmail(),
                patient.getGender() != null ? patient.getGender() : patient.getUser().getGender(),
                patient.getPhone(),
                patient.getUser().getCreatedAt()
        );
    }

    @Transactional(readOnly = true)
    public List<AdminStaffResponse> getStaff() {
        Map<Long, Doctor> doctorsByUserId = doctorRepository.findAll().stream()
                .filter(doctor -> doctor.getUser() != null)
                .collect(Collectors.toMap(doctor -> doctor.getUser().getId(), Function.identity()));

        return userRepository.findByRoleIn(List.of(Role.DOCTOR, Role.LAB_TECH)).stream()
                .map(user -> {
                    Doctor doctor = doctorsByUserId.get(user.getId());
                    String status = doctor != null
                            ? doctor.getApprovalStatus().name()
                            : user.isMustResetPassword() ? "PASSWORD_RESET_REQUIRED" : "ACTIVE";
                    return new AdminStaffResponse(
                            user.getId(),
                            user.getFullName(),
                            user.getEmail(),
                            user.getRole().name(),
                            status,
                            doctor == null ? null : doctor.getSpecialization(),
                            user.getCreatedAt()
                    );
                })
                .sorted(Comparator.comparing(AdminStaffResponse::fullName, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AdminAppointmentResponse> getPatientAppointments(Long patientId) {
        if (!patientRepository.existsById(patientId)) {
            throw new IllegalArgumentException("Patient not found");
        }
        return appointmentRepository.findByPatientId(patientId).stream()
                .sorted(Comparator.comparing(Appointment::getAppointmentDate).reversed())
                .map(this::toAdminAppointmentResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AdminAppointmentResponse> getAppointments() {
        return appointmentRepository.findAll().stream()
                .sorted(Comparator.comparing(Appointment::getAppointmentDate))
                .map(this::toAdminAppointmentResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AdminAppointmentResponse> getPendingAppointments() {
        return appointmentRepository.findAll().stream()
                .filter(appointment -> appointment.getStatus() == Appointment.Status.PENDING)
                .sorted(Comparator.comparing(Appointment::getAppointmentDate))
                .map(this::toAdminAppointmentResponse)
                .toList();
    }

    public AdminAppointmentResponse toAdminAppointmentResponse(Appointment appointment) {
        Patient patient = appointment.getPatient();
        Doctor doctor = appointment.getDoctor();
        return new AdminAppointmentResponse(
                appointment.getId(),
                patient == null ? null : patient.getId(),
                patient != null && patient.getUser() != null ? patient.getUser().getFullName() : "Unknown patient",
                patient != null && patient.getUser() != null ? patient.getUser().getEmail() : null,
                doctor != null && doctor.getUser() != null ? doctor.getUser().getFullName() : "Unknown doctor",
                appointment.getAppointmentDate(),
                appointment.getStatus(),
                appointment.getReason()
        );
    }

    public List<RecentPatientResponse> getRecentPatients() {
        return patientRepository.findTop5ByOrderByIdDesc().stream()
                .map(p -> new RecentPatientResponse(
                        p.getUser().getFullName(),
                        "PT-" + String.format("%05d", p.getId()),
                        p.getGender() != null ? p.getGender() : p.getUser().getGender(),
                        p.getPhone(),
                        p.getUser().getCreatedAt() != null
                                ? p.getUser().getCreatedAt().toLocalDate().toString()
                                : "—"
                ))
                .collect(Collectors.toList());
    }

    private PageRequest pageableSettings(int page, int size) {
        return PageRequest.of(
                Math.max(0, page),
                Math.max(1, Math.min(size, 100)),
                Sort.by(Sort.Direction.DESC, "id")
        );
    }

    public List<ScheduleItemResponse> getTodaySchedule() {
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = LocalDate.now().atTime(LocalTime.MAX);

        return appointmentRepository.findByAppointmentDateBetween(startOfDay, endOfDay).stream()
                .sorted(Comparator.comparing(Appointment::getAppointmentDate))
                .map(a -> new ScheduleItemResponse(
                        a.getAppointmentDate().toLocalTime().toString(),
                        a.getPatient().getUser().getFullName(),
                        a.getDoctor().getUser().getFullName(),
                        a.getDoctor().getSpecialization(),
                        a.getStatus().name()
                ))
                .collect(Collectors.toList());
    }
}