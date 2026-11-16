package com.hms.dto;

import jakarta.validation.constraints.*;
import lombok.*;
import java.time.LocalDateTime;

@Getter @Setter
public class AppointmentRequest {
    @NotNull
    private Long doctorId;

    @NotNull
    @Future(message = "Appointment date must be in the future")
    private LocalDateTime appointmentDate;

    private String reason;
}
