package com.hms.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateInvoiceRequest(
        @NotBlank @Email @Size(max = 150) String patientEmail,
        @Min(100) @Max(1000000000) long amountPaise,
        @NotBlank @Size(max = 255) String description,
        Long appointmentId
) {
}
