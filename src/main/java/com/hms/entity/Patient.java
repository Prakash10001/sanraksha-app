package com.hms.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "patients")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class Patient {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "user_id", unique = true)
    private User user;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Column(length = 10)
    private String gender;

    @Column(length = 20)
    private String phone;

    @Column(length = 255)
    private String address;

    @Builder.Default
    @Column(name = "must_reset_password", nullable = false)
    private boolean mustResetPassword = false;

    @Column(name = "blood_group", length = 5)
    private String bloodGroup;

    @Column(name = "reported_allergies", columnDefinition = "TEXT")
    private String reportedAllergies;

    @Column(name = "reported_conditions", columnDefinition = "TEXT")
    private String reportedConditions;

    @Column(name = "health_info_updated_at")
    private LocalDateTime healthInfoUpdatedAt;
}
