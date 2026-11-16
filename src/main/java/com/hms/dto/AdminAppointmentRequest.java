package com.hms.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class AdminAppointmentRequest {
    @NotBlank
    @Email
    @Size(max = 150)
    private String patientEmail;

    private boolean createPatient;

    @Size(max = 120)
    private String fullName;

    @Size(min = 6, max = 100)
    private String password;

    @NotNull
    private Long doctorId;

    @NotNull
    @Future(message = "Appointment date must be in the future")
    private LocalDateTime appointmentDate;

    @Size(max = 255)
    private String reason;
}
