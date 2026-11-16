package com.hms.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "appointments")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Appointment {

    public enum Status { PENDING, CONFIRMED, COMPLETED, CANCELLED }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "patient_id")
    private Patient patient;

    @ManyToOne
    @JoinColumn(name = "doctor_id")
    private Doctor doctor;

    @Column(name = "appointment_date", nullable = false)
    private LocalDateTime appointmentDate;

    @Column(length = 255)
    private String reason;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    private Status status = Status.PENDING;

    @Builder.Default
    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;
}
