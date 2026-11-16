package com.hms.dto;

import com.hms.entity.DoctorApprovalStatus;

import java.time.LocalTime;

public record DoctorSummaryResponse(
        Long id,
        String fullName,
        String email,
        String specialization,
        String department,
        DoctorApprovalStatus approvalStatus,
        LocalTime availableFrom,
        LocalTime availableTo
) {
}
