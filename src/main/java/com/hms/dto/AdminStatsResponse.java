package com.hms.dto;

import lombok.*;

@Getter @Setter
@AllArgsConstructor
public class AdminStatsResponse {
    private long totalPatients;
    private long patientsRegisteredToday;
    private long totalDoctors;
    private long appointmentsToday;
    private long pendingAppointments;
}