package com.hms.repository;

import com.hms.entity.Prescription;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PrescriptionRepository extends JpaRepository<Prescription, Long> {
    List<Prescription> findByPatientIdOrderByPrescribedAtDesc(Long patientId);
    List<Prescription> findByDoctorIdOrderByPrescribedAtDesc(Long doctorId);
}
