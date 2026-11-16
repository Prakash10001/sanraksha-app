package com.hms.dto;

import com.hms.entity.LabReport;

import java.time.LocalDateTime;

public record LabReportResponse(
        Long id,
        Long patientId,
        String patientName,
        Long appointmentId,
        String testName,
        LabReport.Priority priority,
        LabReport.Status status,
        String notes,
        String doctorName,
        LocalDateTime orderedAt,
        LocalDateTime resultDate
) {
}
