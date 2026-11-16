package com.hms.dto;

import com.hms.entity.Appointment;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
public class DoctorPatientAppointmentResponse {
    private Long appointmentId;
    private LocalDateTime appointmentDate;
    private Appointment.Status status;
}
