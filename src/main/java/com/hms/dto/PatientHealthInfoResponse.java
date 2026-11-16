package com.hms.dto;

import java.time.LocalDateTime;

public record PatientHealthInfoResponse(
        Long patientId,
        String reportedAllergies,
        String reportedConditions,
        LocalDateTime updatedAt
) {}
