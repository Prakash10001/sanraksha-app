package com.hms.controller;

import com.hms.dto.CreatePrescriptionRequest;
import com.hms.dto.PrescriptionResponse;
import com.hms.entity.Role;
import com.hms.service.PrescriptionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/api/prescriptions")
@RequiredArgsConstructor
public class PrescriptionController {

    private final PrescriptionService prescriptionService;

    @PostMapping
    public PrescriptionResponse create(
            Authentication authentication,
            @Valid @RequestBody CreatePrescriptionRequest request) {
        return prescriptionService.create(authentication.getName(), role(authentication), request);
    }

    @GetMapping("/me")
    public List<PrescriptionResponse> myPrescriptions(Authentication authentication) {
        return prescriptionService.getForPatient(authentication.getName(), role(authentication));
    }

    @GetMapping("/doctor/me")
    public List<PrescriptionResponse> doctorPrescriptions(Authentication authentication) {
        return prescriptionService.getForDoctor(authentication.getName(), role(authentication));
    }

    private Role role(Authentication authentication) {
        return authentication.getAuthorities().stream()
                .map(authority -> authority.getAuthority())
                .filter(authority -> authority.startsWith("ROLE_"))
                .map(authority -> {
                    try {
                        return Role.valueOf(authority.substring("ROLE_".length()).toUpperCase(Locale.ROOT));
                    } catch (IllegalArgumentException exception) {
                        throw new AccessDeniedException("Unknown account role");
                    }
                })
                .findFirst()
                .orElseThrow(() -> new AccessDeniedException("Account role is missing"));
    }
}
