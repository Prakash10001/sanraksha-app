package com.hms.repository;

import com.hms.entity.Doctor;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface DoctorRepository extends JpaRepository<Doctor, Long> {
    List<Doctor> findBySpecializationIgnoreCaseContaining(String specialization);
     // NEW
    Optional<Doctor> findByUserId(Long userId);

    // NEW
    boolean existsByMedicalRegistrationNumber(String medicalRegistrationNumber);
}
