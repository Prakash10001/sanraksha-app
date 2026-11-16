package com.hms.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record PatientProfileResponse(
        Long id,
        String fullName,
        String email,
        String role,
        LocalDateTime createdAt,
        String userGender,
        LocalDate dateOfBirth,
        String gender,
        String phone,
        String address,
        String bloodGroup
) {}
