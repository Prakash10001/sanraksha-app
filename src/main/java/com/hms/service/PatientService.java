package com.hms.service;

import com.hms.dto.PatientProfileResponse;
import com.hms.dto.PatientHealthInfoRequest;
import com.hms.dto.PatientHealthInfoResponse;
import com.hms.dto.UpdatePatientProfileRequest;
import com.hms.entity.Patient;
import com.hms.entity.Role;
import com.hms.repository.PatientRepository;
import com.hms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class PatientService {

    private final PatientRepository patientRepository;
    private final UserRepository userRepository;

    /** Resolves the Patient profile linked to a logged-in user's email (from the JWT). */
    @Transactional
    public Patient getPatientByEmail(String email) {
        var user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        return patientRepository.findByUserId(user.getId())
                .orElseGet(() -> {
                    if (user.getRole() != Role.PATIENT) {
                        throw new IllegalArgumentException("No patient profile linked to this account");
                    }
                    return patientRepository.save(Patient.builder()
                            .user(user)
                            .mustResetPassword(user.isMustResetPassword())
                            .build());
                });
    }

    @Transactional
    public PatientProfileResponse getMyProfile(String email) {
        Patient patient = getPatientByEmail(email);
        return toProfileResponse(patient);
    }

    @Transactional
    public PatientProfileResponse updateMyProfile(String email, UpdatePatientProfileRequest request) {
        Patient patient = getPatientByEmail(email);
        if (request.getFullName() != null && !request.getFullName().isBlank()) {
            patient.getUser().setFullName(request.getFullName().trim());
            userRepository.save(patient.getUser());
        }
        patient.setPhone(request.getPhone().trim());
        patient.setGender(request.getGender().trim());
        patient.setDateOfBirth(request.getDateOfBirth());
        patient.setBloodGroup(request.getBloodGroup().trim());
        patient.setAddress(request.getAddress().trim());

        return toProfileResponse(patientRepository.save(patient));
    }

    @Transactional
    public PatientHealthInfoResponse getMyHealthInfo(String email) {
        Patient patient = getPatientByEmail(email);
        return toHealthInfoResponse(patient);
    }

    @Transactional
    public PatientHealthInfoResponse updateMyHealthInfo(String email, PatientHealthInfoRequest request) {
        Patient patient = getPatientByEmail(email);
        patient.setReportedAllergies(normalizeHealthInfo(request.getReportedAllergies()));
        patient.setReportedConditions(normalizeHealthInfo(request.getReportedConditions()));
        patient.setHealthInfoUpdatedAt(LocalDateTime.now());
        return toHealthInfoResponse(patientRepository.save(patient));
    }

    private String normalizeHealthInfo(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private PatientHealthInfoResponse toHealthInfoResponse(Patient patient) {
        return new PatientHealthInfoResponse(
                patient.getId(),
                patient.getReportedAllergies(),
                patient.getReportedConditions(),
                patient.getHealthInfoUpdatedAt()
        );
    }

    private PatientProfileResponse toProfileResponse(Patient patient) {
        return new PatientProfileResponse(
                patient.getId(),
                patient.getUser().getFullName(),
                patient.getUser().getEmail(),
                patient.getUser().getRole().name(),
                patient.getUser().getCreatedAt(),
                patient.getUser().getGender(),
                patient.getDateOfBirth(),
                patient.getGender(),
                patient.getPhone(),
                patient.getAddress(),
                patient.getBloodGroup()
        );
    }
}
