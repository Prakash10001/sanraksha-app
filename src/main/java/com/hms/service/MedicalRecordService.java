package com.hms.service;

import com.hms.dto.MedicalRecordRequest;
import com.hms.entity.MedicalRecord;
import com.hms.entity.Patient;
import com.hms.repository.MedicalRecordRepository;
import com.hms.repository.PatientRepository;
import com.hms.repository.AppointmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MedicalRecordService {

    private final MedicalRecordRepository medicalRecordRepository;
    private final PatientRepository patientRepository;
    private final DoctorService doctorService;
    private final AppointmentRepository appointmentRepository;

    public MedicalRecord addRecord(String doctorEmail, MedicalRecordRequest request) {
        Patient patient = patientRepository.findById(request.getPatientId())
                .orElseThrow(() -> new IllegalArgumentException("Patient not found"));

        var doctor = doctorService.getDoctorByEmail(doctorEmail);
        if (!appointmentRepository.existsByPatientIdAndDoctorId(patient.getId(), doctor.getId())) {
            throw new IllegalArgumentException("A doctor can only add records for their own patients");
        }
        if ((request.getBloodPressureSystolic() == null) != (request.getBloodPressureDiastolic() == null)) {
            throw new IllegalArgumentException("Both blood pressure values must be provided together");
        }

        MedicalRecord record = MedicalRecord.builder()
                .patient(patient)
                .doctor(doctor)
                .diagnosis(request.getDiagnosis())
                .bloodPressureSystolic(request.getBloodPressureSystolic())
                .bloodPressureDiastolic(request.getBloodPressureDiastolic())
                .heartRateBpm(request.getHeartRateBpm())
                .temperatureCelsius(request.getTemperatureCelsius())
                .weightKg(request.getWeightKg())
                .oxygenSaturationPercent(request.getOxygenSaturationPercent())
                .prescription(request.getPrescription())
                .notes(request.getNotes())
                .build();

        return medicalRecordRepository.save(record);
    }

    public List<MedicalRecord> getForPatient(Long patientId) {
        return medicalRecordRepository.findByPatientIdOrderByVisitDateDesc(patientId);
    }
}
