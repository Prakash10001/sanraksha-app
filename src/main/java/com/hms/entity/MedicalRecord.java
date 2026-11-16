package com.hms.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "medical_records")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class MedicalRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "patient_id")
    private Patient patient;

    @ManyToOne
    @JoinColumn(name = "doctor_id")
    private Doctor doctor;

    @Builder.Default
    @Column(name = "visit_date")
    private LocalDateTime visitDate = LocalDateTime.now();

    @Column(length = 255)
    private String diagnosis;

    @Column(name = "blood_pressure_systolic")
    private Integer bloodPressureSystolic;

    @Column(name = "blood_pressure_diastolic")
    private Integer bloodPressureDiastolic;

    @Column(name = "heart_rate_bpm")
    private Integer heartRateBpm;

    @Column(name = "temperature_celsius", precision = 4, scale = 1)
    private BigDecimal temperatureCelsius;

    @Column(name = "weight_kg", precision = 6, scale = 2)
    private BigDecimal weightKg;

    @Column(name = "oxygen_saturation_percent")
    private Integer oxygenSaturationPercent;

    @Column(columnDefinition = "TEXT")
    private String prescription;

    @Column(columnDefinition = "TEXT")
    private String notes;
}
