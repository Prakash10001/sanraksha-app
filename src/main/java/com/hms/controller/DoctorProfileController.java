package com.hms.controller;

import com.hms.dto.DoctorProfileResponse;
import com.hms.service.DoctorProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

@RestController
@RequestMapping("/api/doctors/me")
@RequiredArgsConstructor
public class DoctorProfileController {

    private final DoctorProfileService doctorProfileService;

    @GetMapping("/profile")
    public DoctorProfileResponse getMyProfile(
            Authentication authentication) {

        return doctorProfileService.getMyProfile(
                authentication.getName());
    }

    @PostMapping(
            value = "/profile",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public DoctorProfileResponse submitProfile(
            @RequestParam String phone,
            @RequestParam String specialization,
            @RequestParam String medicalRegistrationNumber,
            @RequestParam("identityDocument")
            MultipartFile identityDocument,
            Authentication authentication) throws IOException {

        return doctorProfileService.submitProfile(
                authentication.getName(),
                phone,
                specialization,
                medicalRegistrationNumber,
                identityDocument);
    }
}