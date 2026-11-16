package com.hms.dto;

import com.hms.entity.Appointment;

import java.time.LocalDateTime;

public record AdminAppointmentResponse(
        Long appointmentId,
        Long patientId,
        String patientName,
        String patientEmail,
        String doctorName,
        LocalDateTime appointmentDate,
        Appointment.Status status,
        String reason
) {
}
