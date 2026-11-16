package com.hms.controller;

import com.hms.dto.MedicalRecordRequest;
import com.hms.entity.MedicalRecord;
import com.hms.service.MedicalRecordService;
import com.hms.service.PatientService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/records")
@RequiredArgsConstructor
public class MedicalRecordController {

    private final MedicalRecordService medicalRecordService;
    private final PatientService patientService;

    // Doctor adds a record for a patient after a visit
    @PostMapping
    public MedicalRecord add(Authentication auth, @Valid @RequestBody MedicalRecordRequest request) {
        return medicalRecordService.addRecord(auth.getName(), request);
    }

    // Patient views their own history
    @GetMapping("/me")
    public List<MedicalRecord> myRecords(Authentication auth) {
        var patient = patientService.getPatientByEmail(auth.getName());
        return medicalRecordService.getForPatient(patient.getId());
    }
}
