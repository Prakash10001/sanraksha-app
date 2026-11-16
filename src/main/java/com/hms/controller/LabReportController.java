package com.hms.controller;

import com.hms.dto.CreateLabReportRequest;
import com.hms.dto.LabReportResponse;
import com.hms.dto.LabReportStatusRequest;
import com.hms.entity.Role;
import com.hms.service.LabReportService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/api/lab-reports")
@RequiredArgsConstructor
public class LabReportController {

    private final LabReportService labReportService;

    @GetMapping
    public List<LabReportResponse> queue(Authentication authentication) {
        return labReportService.getQueue(authentication.getName(), role(authentication));
    }

    @GetMapping("/me")
    public List<LabReportResponse> myReports(Authentication authentication) {
        return labReportService.getPatientReports(authentication.getName(), role(authentication));
    }

    @PostMapping("/orders")
    public LabReportResponse createOrder(
            Authentication authentication,
            @Valid @RequestBody CreateLabReportRequest request) {
        return labReportService.createOrder(authentication.getName(), role(authentication), request);
    }

    @PatchMapping("/{reportId}/status")
    public LabReportResponse updateStatus(
            @PathVariable Long reportId,
            Authentication authentication,
            @Valid @RequestBody LabReportStatusRequest request) {
        return labReportService.updateStatus(reportId, role(authentication), request.getStatus());
    }

    @PostMapping(value = "/{reportId}/result", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public LabReportResponse uploadResult(
            @PathVariable Long reportId,
            Authentication authentication,
            @RequestParam("file") MultipartFile file) throws IOException {
        return labReportService.uploadResult(reportId, role(authentication), file);
    }

    @PatchMapping("/{reportId}/review")
    public LabReportResponse review(
            @PathVariable Long reportId,
            Authentication authentication,
            @Valid @RequestBody LabReportStatusRequest request) {
        return labReportService.review(reportId, authentication.getName(), role(authentication), request.getStatus());
    }

    @GetMapping("/{reportId}/download")
    public ResponseEntity<byte[]> download(
            @PathVariable Long reportId,
            Authentication authentication) {
        LabReportService.DownloadableReport file =
                labReportService.download(reportId, authentication.getName(), role(authentication));
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(file.contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment()
                        .filename(file.filename(), StandardCharsets.UTF_8)
                        .build()
                        .toString())
                .header(HttpHeaders.CACHE_CONTROL, "no-store, private")
                .contentLength(file.content().length)
                .body(file.content());
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
