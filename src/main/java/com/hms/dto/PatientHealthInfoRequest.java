package com.hms.dto;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class PatientHealthInfoRequest {

    @Size(max = 4000)
    private String reportedAllergies;

    @Size(max = 4000)
    private String reportedConditions;
}
