package com.hms.repository;

import com.hms.entity.SymptomCheck;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SymptomCheckRepository extends JpaRepository<SymptomCheck, Long> {
    List<SymptomCheck> findByPatientIdOrderByCreatedAtDesc(Long patientId);
}
