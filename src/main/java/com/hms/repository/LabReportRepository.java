package com.hms.repository;

import com.hms.entity.LabReport;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LabReportRepository extends JpaRepository<LabReport, Long> {
    List<LabReport> findAllByOrderByOrderedAtDesc();
    List<LabReport> findByOrderedByIdOrderByOrderedAtDesc(Long doctorId);
    List<LabReport> findByPatientIdAndStatusOrderByOrderedAtDesc(Long patientId, LabReport.Status status);
    Optional<LabReport> findByIdAndPatientId(Long reportId, Long patientId);
}
