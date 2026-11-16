package com.hms.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class CreatePrescriptionRequest {

    @NotNull
    private Long patientId;

    private Long appointmentId;

    @Size(max = 5000)
    private String notes;

    @NotEmpty
    @Size(max = 20)
    @Valid
    private List<MedicineRequest> medicines;

    @Getter
    @Setter
    public static class MedicineRequest {

        @jakarta.validation.constraints.NotBlank
        @Size(max = 150)
        private String name;

        @jakarta.validation.constraints.NotBlank
        @Size(max = 100)
        private String dosage;

        @jakarta.validation.constraints.NotBlank
        @Size(max = 100)
        private String frequency;

        @jakarta.validation.constraints.NotBlank
        @Size(max = 100)
        private String duration;

        @Size(max = 500)
        private String instructions;
    }
}
