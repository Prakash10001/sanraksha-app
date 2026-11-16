package com.hms.repository;

import com.hms.entity.Patient;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.time.LocalDateTime;

public interface PatientRepository extends JpaRepository<Patient, Long> {
    Optional<Patient> findByUserId(Long userId);
    Optional<Patient> findByUser_Email(String email);
    Optional<Patient> findByUser_EmailIgnoreCase(String email);
    Page<Patient> findByUser_FullNameContainingIgnoreCaseOrUser_EmailContainingIgnoreCase(
            String name, String email, Pageable pageable);
    List<Patient> findTop5ByOrderByIdDesc();
    long countByUser_CreatedAtBetween(LocalDateTime start, LocalDateTime end);
    List<Patient> findByUser_CreatedAtBetweenOrderByUser_CreatedAtDesc(LocalDateTime start, LocalDateTime end);
}