package com.hms.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "symptom_checks")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class SymptomCheck {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "patient_id")
    private Patient patient;

    @Column(name = "symptoms_input", nullable = false, columnDefinition = "TEXT")
    private String symptomsInput;

    @Column(name = "predicted_disease", length = 150)
    private String predictedDisease;

    private Double confidence;

    @Column(name = "recommended_specialization", length = 100)
    private String recommendedSpecialization;

    @Column(length = 20)
    private String urgency;

    @Builder.Default
    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();
}
