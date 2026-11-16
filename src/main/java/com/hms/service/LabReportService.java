package com.hms.service;

import com.hms.dto.CreateLabReportRequest;
import com.hms.dto.LabReportResponse;
import com.hms.entity.*;
import com.hms.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class LabReportService {

    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024;

    private final LabReportRepository labReportRepository;
    private final LabReportFileRepository labReportFileRepository;
    private final PatientRepository patientRepository;
    private final AppointmentRepository appointmentRepository;
    private final DoctorService doctorService;

    @Transactional(readOnly = true)
    public List<LabReportResponse> getQueue(String email, Role role) {
        List<LabReport> reports;
        if (role == Role.LAB_TECH || role == Role.ADMIN) {
            reports = labReportRepository.findAllByOrderByOrderedAtDesc();
        } else if (role == Role.DOCTOR) {
            Doctor doctor = doctorService.getDoctorByEmail(email);
            reports = labReportRepository.findByOrderedByIdOrderByOrderedAtDesc(doctor.getId());
        } else {
            throw new AccessDeniedException("Only lab staff, doctors, or admins can view the lab queue");
        }
        return reports.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<LabReportResponse> getPatientReports(String email, Role role) {
        requireRole(role, Role.PATIENT);
        Patient patient = patientRepository.findByUser_Email(email)
                .orElseThrow(() -> new IllegalArgumentException("Patient profile not found"));
        return labReportRepository.findByPatientIdAndStatusOrderByOrderedAtDesc(
                        patient.getId(), LabReport.Status.PUBLISHED)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public LabReportResponse createOrder(String email, Role role, CreateLabReportRequest request) {
        requireRole(role, Role.DOCTOR);
        Doctor doctor = doctorService.getDoctorByEmail(email);
        Patient patient = patientRepository.findById(request.getPatientId())
                .orElseThrow(() -> new IllegalArgumentException("Patient not found"));

        Appointment appointment = null;
        if (request.getAppointmentId() != null) {
            appointment = appointmentRepository.findById(request.getAppointmentId())
                    .orElseThrow(() -> new IllegalArgumentException("Appointment not found"));
            if (!appointment.getPatient().getId().equals(patient.getId())
                    || !appointment.getDoctor().getId().equals(doctor.getId())) {
                throw new IllegalArgumentException("Appointment must belong to the selected patient and doctor");
            }
        } else if (!appointmentRepository.existsByPatientIdAndDoctorId(patient.getId(), doctor.getId())) {
            throw new AccessDeniedException("You can only order tests for patients assigned to your care");
        }

        LabReport report = LabReport.builder()
                .patient(patient)
                .orderedBy(doctor)
                .appointment(appointment)
                .testName(request.getTestName().trim())
                .priority(request.getPriority())
                .notes(trimToNull(request.getNotes()))
                .status(LabReport.Status.ORDERED)
                .orderedAt(LocalDateTime.now())
                .build();
        return toResponse(labReportRepository.save(report));
    }

    @Transactional
    public LabReportResponse updateStatus(Long reportId, Role role, LabReport.Status status) {
        requireLabStaff(role);
        if (status == LabReport.Status.PUBLISHED) {
            throw new IllegalArgumentException("Only the ordering doctor can release a report");
        }

        LabReport report = getReport(reportId);
        if (report.getStatus() == LabReport.Status.PUBLISHED) {
            throw new IllegalArgumentException("A published report cannot be changed");
        }
        if (status == LabReport.Status.READY_FOR_REVIEW
                && labReportFileRepository.findByReportId(reportId).isEmpty()) {
            throw new IllegalArgumentException("Upload a result file before marking the report ready for review");
        }
        report.setStatus(status);
        return toResponse(labReportRepository.save(report));
    }

    @Transactional
    public LabReportResponse uploadResult(Long reportId, Role role, MultipartFile upload) throws IOException {
        requireLabStaff(role);
        LabReport report = getReport(reportId);
        if (report.getStatus() == LabReport.Status.PUBLISHED) {
            throw new IllegalArgumentException("A published report cannot be changed");
        }
        ValidatedFile file = validateFile(upload);
        LocalDateTime uploadedAt = LocalDateTime.now();

        LabReportFile savedFile = labReportFileRepository.findByReportId(reportId)
                .map(existing -> {
                    existing.setContent(file.content());
                    existing.setOriginalFilename(file.filename());
                    existing.setContentType(file.contentType());
                    existing.setUploadedAt(uploadedAt);
                    return existing;
                })
                .orElseGet(() -> LabReportFile.builder()
                        .report(report)
                        .content(file.content())
                        .originalFilename(file.filename())
                        .contentType(file.contentType())
                        .uploadedAt(uploadedAt)
                        .build());
        labReportFileRepository.save(savedFile);
        report.setResultUploadedAt(uploadedAt);
        report.setStatus(LabReport.Status.READY_FOR_REVIEW);
        return toResponse(labReportRepository.save(report));
    }

    @Transactional
    public LabReportResponse review(Long reportId, String email, Role role, LabReport.Status status) {
        requireRole(role, Role.DOCTOR);
        if (status != LabReport.Status.PUBLISHED) {
            throw new IllegalArgumentException("The review action must release the report");
        }

        Doctor doctor = doctorService.getDoctorByEmail(email);
        LabReport report = getReport(reportId);
        if (!report.getOrderedBy().getId().equals(doctor.getId())) {
            throw new AccessDeniedException("Only the ordering doctor can review this report");
        }
        if (report.getStatus() != LabReport.Status.READY_FOR_REVIEW
                || labReportFileRepository.findByReportId(reportId).isEmpty()) {
            throw new IllegalArgumentException("The report must have an uploaded result ready for review");
        }
        report.setStatus(LabReport.Status.PUBLISHED);
        return toResponse(labReportRepository.save(report));
    }

    @Transactional(readOnly = true)
    public DownloadableReport download(Long reportId, String email, Role role) {
        LabReport report = getReport(reportId);
        switch (role) {
            case PATIENT -> {
                Patient patient = patientRepository.findByUser_Email(email)
                        .orElseThrow(() -> new IllegalArgumentException("Patient profile not found"));
                if (!report.getPatient().getId().equals(patient.getId())
                        || report.getStatus() != LabReport.Status.PUBLISHED) {
                    throw new AccessDeniedException("This report is not available to this patient");
                }
            }
            case DOCTOR -> {
                Doctor doctor = doctorService.getDoctorByEmail(email);
                if (!report.getOrderedBy().getId().equals(doctor.getId())) {
                    throw new AccessDeniedException("This report is not available to this doctor");
                }
            }
            case LAB_TECH, ADMIN -> {
                // Lab staff and admins may access results for operational purposes.
            }
        }
        LabReportFile file = labReportFileRepository.findByReportId(reportId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Report file not found"));
        return new DownloadableReport(file.getContent(), file.getContentType(), file.getOriginalFilename());
    }

    private LabReport getReport(Long reportId) {
        return labReportRepository.findById(reportId)
                .orElseThrow(() -> new IllegalArgumentException("Lab report not found"));
    }

    private LabReportResponse toResponse(LabReport report) {
        String patientName = report.getPatient().getUser().getFullName();
        String doctorName = report.getOrderedBy().getUser().getFullName();
        Long appointmentId = report.getAppointment() == null ? null : report.getAppointment().getId();
        return new LabReportResponse(
                report.getId(),
                report.getPatient().getId(),
                patientName,
                appointmentId,
                report.getTestName(),
                report.getPriority(),
                report.getStatus(),
                report.getNotes(),
                doctorName,
                report.getOrderedAt(),
                report.getResultUploadedAt());
    }

    private ValidatedFile validateFile(MultipartFile upload) throws IOException {
        if (upload == null || upload.isEmpty()) {
            throw new IllegalArgumentException("A report file is required");
        }
        if (upload.getSize() > MAX_FILE_SIZE) {
            throw new IllegalArgumentException("Report files must be 5 MB or smaller");
        }

        String contentType = upload.getContentType();
        byte[] content = upload.getBytes();
        String detectedType = detectContentType(content);
        if (detectedType == null || !detectedType.equalsIgnoreCase(contentType)) {
            throw new IllegalArgumentException("Only valid PDF, JPG, and PNG report files are allowed");
        }

        String filename = sanitizeFilename(upload.getOriginalFilename());
        return new ValidatedFile(content, filename, detectedType);
    }

    private String detectContentType(byte[] content) {
        if (content.length >= 5
                && content[0] == '%' && content[1] == 'P' && content[2] == 'D'
                && content[3] == 'F' && content[4] == '-') {
            return "application/pdf";
        }
        if (content.length >= 8
                && (content[0] & 0xff) == 0x89 && content[1] == 'P' && content[2] == 'N'
                && content[3] == 'G' && content[4] == 0x0d && content[5] == 0x0a
                && content[6] == 0x1a && content[7] == 0x0a) {
            return "image/png";
        }
        if (content.length >= 3
                && (content[0] & 0xff) == 0xff && (content[1] & 0xff) == 0xd8
                && (content[2] & 0xff) == 0xff) {
            return "image/jpeg";
        }
        return null;
    }

    private String sanitizeFilename(String filename) {
        String sanitized = filename == null ? "lab-report" : filename.replace('\\', '/');
        sanitized = sanitized.substring(sanitized.lastIndexOf('/') + 1)
                .replaceAll("[\\r\\n\"\\\\]", "_")
                .trim();
        if (sanitized.isEmpty()) {
            sanitized = "lab-report";
        }
        return sanitized.length() <= 255 ? sanitized : sanitized.substring(sanitized.length() - 255);
    }

    private String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private void requireLabStaff(Role role) {
        if (role != Role.LAB_TECH && role != Role.ADMIN) {
            throw new AccessDeniedException("Only lab staff can update report results");
        }
    }

    private void requireRole(Role actualRole, Role requiredRole) {
        if (actualRole != requiredRole) {
            throw new AccessDeniedException("This action is not available to your account");
        }
    }

    private record ValidatedFile(byte[] content, String filename, String contentType) {
    }

    public record DownloadableReport(byte[] content, String contentType, String filename) {
    }
}
