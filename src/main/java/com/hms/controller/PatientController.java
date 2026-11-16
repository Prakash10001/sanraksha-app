package com.hms.controller;

import com.hms.dto.PatientProfileResponse;
import com.hms.dto.PatientHealthInfoRequest;
import com.hms.dto.PatientHealthInfoResponse;
import com.hms.dto.UpdatePatientProfileRequest;
import com.hms.service.PatientService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/patients")
@RequiredArgsConstructor
public class PatientController {

    private final PatientService patientService;

    @GetMapping("/me")
    public PatientProfileResponse getMyProfile(Authentication authentication) {
        return patientService.getMyProfile(authentication.getName());
    }

    @PutMapping("/me")
    public PatientProfileResponse updateMyProfile(
            Authentication authentication,
            @Valid @RequestBody UpdatePatientProfileRequest request) {
        return patientService.updateMyProfile(authentication.getName(), request);
    }

    @GetMapping("/me/health-info")
    public PatientHealthInfoResponse getMyHealthInfo(Authentication authentication) {
        return patientService.getMyHealthInfo(authentication.getName());
    }

    @PutMapping("/me/health-info")
    public PatientHealthInfoResponse updateMyHealthInfo(
            Authentication authentication,
            @Valid @RequestBody PatientHealthInfoRequest request) {
        return patientService.updateMyHealthInfo(authentication.getName(), request);
    }
}
