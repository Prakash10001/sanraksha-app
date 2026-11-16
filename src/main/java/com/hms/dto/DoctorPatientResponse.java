package com.hms.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@AllArgsConstructor
public class DoctorPatientResponse {
    private Long patientId;
    private String patientCode;
    private String fullName;
    private String gender;
    private String reportedAllergies;
    private String reportedConditions;
    private LocalDateTime healthInfoUpdatedAt;
    private List<DoctorPatientAppointmentResponse> appointments;
}
