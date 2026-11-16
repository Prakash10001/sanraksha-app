package com.hms.dto;

import lombok.*;

@Getter @Setter
@AllArgsConstructor
public class RecentPatientResponse {
    private String name;
    private String patientCode;
    private String gender;
    private String phone;
    private String registeredOn;
}