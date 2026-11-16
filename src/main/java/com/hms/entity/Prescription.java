package com.hms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "prescriptions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Prescription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "doctor_id", nullable = false)
    private Doctor doctor;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "appointment_id")
    private Appointment appointment;

    @ElementCollection
    @CollectionTable(name = "prescription_medicines", joinColumns = @JoinColumn(name = "prescription_id"))
    @OrderColumn(name = "medicine_order")
    @Builder.Default
    private List<PrescriptionMedicine> medicines = new ArrayList<>();

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "prescribed_at", nullable = false)
    @Builder.Default
    private LocalDateTime prescribedAt = LocalDateTime.now();
}
