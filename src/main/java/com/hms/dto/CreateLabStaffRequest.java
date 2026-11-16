package com.hms.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateLabStaffRequest(
        @NotBlank @Size(max = 120) String fullName,
        @NotBlank @Email @Size(max = 150) String email,
        @NotBlank @Size(min = 6, max = 100) String password
) {
}
