package com.hms.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter @Setter
public class SymptomCheckRequest {
    @NotBlank(message = "Please describe at least one symptom")
    private String symptoms; // free text or comma-separated, e.g. "fever, sore throat, fatigue"
}
