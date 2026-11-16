package com.hms.repository;

import com.hms.entity.LabReportFile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface LabReportFileRepository extends JpaRepository<LabReportFile, Long> {
    Optional<LabReportFile> findByReportId(Long reportId);
}
