package com.hms.dto;

import com.hms.entity.DoctorApprovalStatus;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class DoctorProfileResponse {

    // NEW
    private Long id;

    // NEW
    private String fullName;

    // NEW
    private String email;

    // NEW
    private String phone;

    // NEW
    private String specialization;

    // NEW
    private String department;

    // NEW
    private String medicalRegistrationNumber;

    // NEW
    private boolean phoneVerified;

    // NEW
    private DoctorApprovalStatus approvalStatus;

    // NEW
    private String rejectionReason;

    // NEW
    private boolean identityDocumentSubmitted;

    private String identityDocumentOriginalName;

    // NEW
    private LocalDateTime submittedAt;
}