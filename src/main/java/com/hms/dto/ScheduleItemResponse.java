package com.hms.dto;

import lombok.*;

@Getter @Setter
@AllArgsConstructor
public class ScheduleItemResponse {
    private String time;
    private String patientName;
    private String doctorName;
    private String specialization;
    private String status;
}