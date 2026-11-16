package com.hms.service;

import com.hms.dto.DoctorSummaryResponse;
import com.hms.entity.Doctor;
import com.hms.repository.DoctorRepository;
import com.hms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DoctorService {

    private final DoctorRepository doctorRepository;
    private final UserRepository userRepository;

    public List<DoctorSummaryResponse> getAll() {
        return doctorRepository.findAll().stream()
                .map(this::toSummary)
                .toList();
    }

    public List<DoctorSummaryResponse> searchBySpecialization(String specialization) {
        return doctorRepository.findBySpecializationIgnoreCaseContaining(specialization).stream()
                .map(this::toSummary)
                .toList();
    }

    /** Resolves the Doctor profile linked to a logged-in user's email (from the JWT). */
    public Doctor getDoctorByEmail(String email) {
        var user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        return doctorRepository.findAll().stream()
                .filter(d -> d.getUser().getId().equals(user.getId()))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("No doctor profile linked to this account"));
    }

    private DoctorSummaryResponse toSummary(Doctor doctor) {
        return new DoctorSummaryResponse(
                doctor.getId(),
                doctor.getUser().getFullName(),
                doctor.getUser().getEmail(),
                doctor.getSpecialization(),
                doctor.getDepartment(),
                doctor.getApprovalStatus(),
                doctor.getAvailableFrom(),
                doctor.getAvailableTo());
    }
}
