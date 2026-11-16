package com.hms.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.math.BigDecimal;

@Getter @Setter
public class MedicalRecordRequest {
    @NotNull
    private Long patientId;

    @Size(max = 255)
    private String diagnosis;

    @Min(50)
    @Max(300)
    private Integer bloodPressureSystolic;

    @Min(30)
    @Max(200)
    private Integer bloodPressureDiastolic;

    @Min(20)
    @Max(250)
    private Integer heartRateBpm;

    @DecimalMin("25.0")
    @DecimalMax("45.0")
    private BigDecimal temperatureCelsius;

    @DecimalMin("0.1")
    @DecimalMax("1000.0")
    private BigDecimal weightKg;

    @Min(0)
    @Max(100)
    private Integer oxygenSaturationPercent;

    @Size(max = 5000)
    private String prescription;

    @Size(max = 5000)
    private String notes;
}
