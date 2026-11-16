package com.hms.dto;

import java.time.LocalDateTime;
import java.util.List;

public record PrescriptionResponse(
        Long id,
        Long patientId,
        String patientName,
        Long appointmentId,
        String doctorName,
        String doctorSpecialization,
        String doctorRegistrationNumber,
        String doctorPhone,
        LocalDateTime prescribedAt,
        String notes,
        List<Medicine> medicines
) {
    public record Medicine(
            String name,
            String dosage,
            String frequency,
            String duration,
            String instructions
    ) {
    }
}
