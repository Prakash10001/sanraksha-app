package com.hms.controller;

import com.hms.dto.DoctorProfileResponse;
import com.hms.entity.Doctor;
import com.hms.entity.DoctorApprovalStatus;
import com.hms.repository.DoctorRepository;
import com.hms.service.DoctorProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;

@RestController
@RequestMapping("/api/admin/doctors")
@RequiredArgsConstructor
public class AdminDoctorController {

    private final DoctorRepository doctorRepository;
    private final DoctorProfileService doctorProfileService;

    @GetMapping
    public List<DoctorProfileResponse> getDoctorApplications(
            @RequestParam(required = false) String status) {
        return doctorProfileService.getApplications(status);
    }

    @GetMapping("/{doctorId}/identity-document")
    public ResponseEntity<byte[]> identityDocument(@PathVariable Long doctorId) throws IOException {
        DoctorProfileService.IdentityDocument file = doctorProfileService.getIdentityDocument(doctorId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(file.contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.inline()
                        .filename(file.filename(), StandardCharsets.UTF_8)
                        .build()
                        .toString())
                .header(HttpHeaders.CACHE_CONTROL, "no-store, private")
                .header("X-Content-Type-Options", "nosniff")
                .contentLength(file.content().length)
                .body(file.content());
    }

    @PatchMapping("/{doctorId}/approval")
    public ResponseEntity<Doctor> updateDoctorApproval(
            @PathVariable Long doctorId,
            @RequestBody ApprovalRequest request) {

        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new IllegalArgumentException("Doctor not found"));

        DoctorApprovalStatus newStatus =
                DoctorApprovalStatus.valueOf(request.status().toUpperCase());

        if (newStatus != DoctorApprovalStatus.APPROVED
                && newStatus != DoctorApprovalStatus.REJECTED) {
            throw new IllegalArgumentException(
                    "Status must be APPROVED or REJECTED");
        }

        doctor.setApprovalStatus(newStatus);

        if (newStatus == DoctorApprovalStatus.REJECTED) {
            doctor.setRejectionReason(request.rejectionReason());
        } else {
            doctor.setRejectionReason(null);
        }

        return ResponseEntity.ok(doctorRepository.save(doctor));
    }

    public record ApprovalRequest(
            String status,
            String rejectionReason
    ) {
    }
}