package com.hms.dto;

import com.hms.entity.LabReport;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateLabReportRequest {

    @NotNull
    private Long patientId;

    private Long appointmentId;

    @NotBlank
    @Size(max = 150)
    private String testName;

    @NotNull
    private LabReport.Priority priority;

    @Size(max = 5000)
    private String notes;
}
