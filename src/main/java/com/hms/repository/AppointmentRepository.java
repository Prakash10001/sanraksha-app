package com.hms.repository;

import com.hms.entity.Appointment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.List;

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {
    List<Appointment> findByPatientId(Long patientId);
    List<Appointment> findByDoctorId(Long doctorId);
    List<Appointment> findByPatientIdAndDoctorId(Long patientId, Long doctorId);
    boolean existsByPatientIdAndDoctorId(Long patientId, Long doctorId);
    List<Appointment> findByAppointmentDateBetween(LocalDateTime start, LocalDateTime end);
    long countByStatus(Appointment.Status status);
}