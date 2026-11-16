package com.hms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class UpdatePatientProfileRequest {

    @Size(max = 120)
    private String fullName;

    @NotBlank
    @Size(max = 20)
    private String phone;

    @NotBlank
    @Size(max = 10)
    private String gender;

    @NotNull
    @Past
    private LocalDate dateOfBirth;

    @NotBlank
    @Size(max = 5)
    private String bloodGroup;

    @NotBlank
    @Size(max = 255)
    private String address;
}
