package com.hms.dto;

import java.time.LocalDateTime;

public record AdminPatientResponse(
        Long id,
        String patientCode,
        String name,
        String email,
        String gender,
        String phone,
        LocalDateTime registeredOn
) {
}
