package com.hms.dto;

import com.hms.entity.Role;
import jakarta.validation.constraints.*;
import lombok.*;

@Getter @Setter
public class RegisterRequest {
    @NotBlank
    private String fullName;

    @NotBlank @Email
    private String email;

    @NotBlank @Size(min = 6, message = "Password must be at least 6 characters")
    private String password;

    @NotNull
    private Role role; // ADMIN / DOCTOR / PATIENT

    // Optional, only relevant when role == DOCTOR
    private String specialization;

    @Builder.Default
    private Boolean mustResetPassword = false;

    private String gender;
}
