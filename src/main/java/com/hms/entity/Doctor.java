package com.hms.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalTime;
import java.time.LocalDateTime;

@Entity
@Table(name = "doctors")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Doctor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "user_id", unique = true)
    private User user;

    @Column(nullable = false, length = 100)
    private String specialization;

    @Column(length = 100)
    private String department;

    // NEW
    @Column(length = 20)
    private String phone;

    // NEW
    @Column(name = "medical_registration_number", length = 100, unique = true)
    private String medicalRegistrationNumber;

    // NEW
    @Builder.Default
    @Column(name = "phone_verified", nullable = false)
    private boolean phoneVerified = false;

    // NEW
    @Enumerated(EnumType.STRING)
    @Column(name = "approval_status", nullable = false, length = 30)
    @Builder.Default
    private DoctorApprovalStatus approvalStatus = DoctorApprovalStatus.NOT_SUBMITTED;

    // NEW
    @Column(name = "rejection_reason", length = 500)
    private String rejectionReason;

    // NEW
    @JsonIgnore
    @Column(name = "identity_document_reference", length = 500)
    private String identityDocumentReference;

    // NEW
    @JsonIgnore
    @Column(name = "identity_document_original_name", length = 255)
    private String identityDocumentOriginalName;

    // NEW
    @JsonIgnore
    @Column(name = "identity_document_content_type", length = 100)
    private String identityDocumentContentType;

    // NEW
    @JsonIgnore
    @Column(name = "identity_document_size")
    private Long identityDocumentSize;

    // NEW
    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Builder.Default
    @Column(name = "available_from")
    private LocalTime availableFrom = LocalTime.of(9, 0);

    @Builder.Default
    @Column(name = "available_to")
    private LocalTime availableTo = LocalTime.of(17, 0);
}
