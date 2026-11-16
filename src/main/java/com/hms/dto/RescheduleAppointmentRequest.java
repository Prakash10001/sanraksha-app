package com.hms.dto;

import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class RescheduleAppointmentRequest {
    @NotNull
    @Future(message = "Appointment date must be in the future")
    private LocalDateTime appointmentDate;
}