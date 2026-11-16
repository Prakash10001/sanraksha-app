package com.hms.service;

import com.hms.dto.CreatePrescriptionRequest;
import com.hms.dto.PrescriptionResponse;
import com.hms.entity.*;
import com.hms.repository.AppointmentRepository;
import com.hms.repository.PatientRepository;
import com.hms.repository.PrescriptionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PrescriptionService {

    private final PrescriptionRepository prescriptionRepository;
    private final PatientRepository patientRepository;
    private final AppointmentRepository appointmentRepository;
    private final DoctorService doctorService;
    private final PatientService patientService;

    @Transactional
    public PrescriptionResponse create(String email, Role role, CreatePrescriptionRequest request) {
        requireRole(role, Role.DOCTOR);
        Doctor doctor = doctorService.getDoctorByEmail(email);
        if (doctor.getApprovalStatus() != DoctorApprovalStatus.APPROVED) {
            throw new AccessDeniedException("Your doctor profile must be approved before writing prescriptions");
        }
        if (request.getAppointmentId() == null) {
            throw new IllegalArgumentException("A confirmed appointment is required to write a prescription");
        }
        Patient patient = patientRepository.findById(request.getPatientId())
                .orElseThrow(() -> new IllegalArgumentException("Patient not found"));

        Appointment appointment = appointmentRepository.findById(request.getAppointmentId())
                .orElseThrow(() -> new IllegalArgumentException("Appointment not found"));
        if (appointment.getPatient() == null
                || appointment.getDoctor() == null
                || !appointment.getPatient().getId().equals(patient.getId())
                || !appointment.getDoctor().getId().equals(doctor.getId())) {
            throw new IllegalArgumentException("Appointment must belong to the selected patient and doctor");
        }
        if (appointment.getStatus() != Appointment.Status.CONFIRMED) {
            throw new IllegalArgumentException("The appointment must be confirmed before writing a prescription");
        }

        List<PrescriptionMedicine> medicines = request.getMedicines().stream()
                .map(this::toMedicine)
                .toList();
        Prescription prescription = Prescription.builder()
                .patient(patient)
                .doctor(doctor)
                .appointment(appointment)
                .medicines(medicines)
                .notes(trimToNull(request.getNotes()))
                .prescribedAt(LocalDateTime.now())
                .build();

        return toResponse(prescriptionRepository.save(prescription));
    }

    @Transactional(readOnly = true)
    public List<PrescriptionResponse> getForPatient(String email, Role role) {
        requireRole(role, Role.PATIENT);
        Patient patient = patientService.getPatientByEmail(email);
        return prescriptionRepository.findByPatientIdOrderByPrescribedAtDesc(patient.getId())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PrescriptionResponse> getForDoctor(String email, Role role) {
        requireRole(role, Role.DOCTOR);
        Doctor doctor = doctorService.getDoctorByEmail(email);
        return prescriptionRepository.findByDoctorIdOrderByPrescribedAtDesc(doctor.getId())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private PrescriptionMedicine toMedicine(CreatePrescriptionRequest.MedicineRequest request) {
        PrescriptionMedicine medicine = new PrescriptionMedicine();
        medicine.setName(request.getName().trim());
        medicine.setDosage(request.getDosage().trim());
        medicine.setFrequency(request.getFrequency().trim());
        medicine.setDuration(request.getDuration().trim());
        medicine.setInstructions(trimToNull(request.getInstructions()));
        return medicine;
    }

    private PrescriptionResponse toResponse(Prescription prescription) {
        Long appointmentId = prescription.getAppointment() == null ? null : prescription.getAppointment().getId();
        return new PrescriptionResponse(
                prescription.getId(),
                prescription.getPatient().getId(),
                prescription.getPatient().getUser().getFullName(),
                appointmentId,
                prescription.getDoctor().getUser().getFullName(),
                prescription.getDoctor().getSpecialization(),
                prescription.getDoctor().getMedicalRegistrationNumber(),
                prescription.getDoctor().getPhone(),
                prescription.getPrescribedAt(),
                prescription.getNotes(),
                prescription.getMedicines().stream()
                        .map(medicine -> new PrescriptionResponse.Medicine(
                                medicine.getName(),
                                medicine.getDosage(),
                                medicine.getFrequency(),
                                medicine.getDuration(),
                                medicine.getInstructions()))
                        .toList());
    }

    private String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private void requireRole(Role actualRole, Role requiredRole) {
        if (actualRole != requiredRole) {
            throw new AccessDeniedException("This action is not available to your account");
        }
    }
}
