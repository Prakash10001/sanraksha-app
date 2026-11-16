package com.hms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "lab_reports")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LabReport {

    public enum Status {
        ORDERED, SAMPLE_COLLECTED, PROCESSING, READY_FOR_REVIEW, PUBLISHED
    }

    public enum Priority {
        ROUTINE, URGENT
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ordered_by_doctor_id", nullable = false)
    private Doctor orderedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "appointment_id")
    private Appointment appointment;

    @Column(name = "test_name", nullable = false, length = 150)
    private String testName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Priority priority;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private Status status = Status.ORDERED;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "ordered_at", nullable = false)
    @Builder.Default
    private LocalDateTime orderedAt = LocalDateTime.now();

    @Column(name = "result_uploaded_at")
    private LocalDateTime resultUploadedAt;
}
