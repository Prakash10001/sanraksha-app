package com.hms.controller;

import com.hms.dto.SymptomCheckRequest;
import com.hms.dto.SymptomCheckResponse;
import com.hms.entity.SymptomCheck;
import com.hms.service.PatientService;
import com.hms.service.SymptomCheckService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/symptom-check")
@RequiredArgsConstructor
public class SymptomController {

    private final SymptomCheckService symptomCheckService;
    private final PatientService patientService;

    @PostMapping
    public SymptomCheckResponse analyze(Authentication auth, @Valid @RequestBody SymptomCheckRequest request) {
        return symptomCheckService.analyze(auth.getName(), request);
    }

    @GetMapping("/history")
    public List<SymptomCheck> history(Authentication auth) {
        var patient = patientService.getPatientByEmail(auth.getName());
        return symptomCheckService.getHistory(patient.getId());
    }
}
