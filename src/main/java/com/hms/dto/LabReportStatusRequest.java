package com.hms.dto;

import com.hms.entity.LabReport;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class LabReportStatusRequest {
    @NotNull
    private LabReport.Status status;
}
