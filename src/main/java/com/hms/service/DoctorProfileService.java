package com.hms.service;

import com.hms.dto.DoctorProfileResponse;
import com.hms.entity.Doctor;
import com.hms.entity.DoctorApprovalStatus;
import com.hms.repository.DoctorRepository;
import com.hms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DoctorProfileService {

    private final DoctorRepository doctorRepository;
    private final UserRepository userRepository;

    private static final long MAX_DOCUMENT_SIZE = 5 * 1024 * 1024;

    private static final Path DOCUMENT_DIRECTORY =
            Paths.get("secure-storage", "doctor-documents")
                    .toAbsolutePath()
                    .normalize();

    // Get logged-in doctor's profile
    public DoctorProfileResponse getMyProfile(String email) {

        Doctor doctor = getDoctorByEmail(email);

        return toProfileResponse(doctor);
    }

    @Transactional(readOnly = true)
    public List<DoctorProfileResponse> getApplications(String status) {
        DoctorApprovalStatus approvalStatus = status == null || status.isBlank()
                ? null
                : DoctorApprovalStatus.valueOf(status.toUpperCase(Locale.ROOT));

        return doctorRepository.findAll().stream()
                .filter(doctor -> approvalStatus == null || doctor.getApprovalStatus() == approvalStatus)
                .map(this::toProfileResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public IdentityDocument getIdentityDocument(Long doctorId) throws IOException {
        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Doctor not found"));
        if (doctor.getIdentityDocumentReference() == null || doctor.getIdentityDocumentReference().isBlank()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Identity document not found");
        }

        Path documentPath = Paths.get(doctor.getIdentityDocumentReference()).toAbsolutePath().normalize();
        if (!documentPath.startsWith(DOCUMENT_DIRECTORY) || !Files.isRegularFile(documentPath)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Identity document not found");
        }

        Path storageDirectory = DOCUMENT_DIRECTORY.toRealPath();
        Path resolvedDocumentPath = documentPath.toRealPath();
        if (!resolvedDocumentPath.startsWith(storageDirectory) || !Files.isRegularFile(resolvedDocumentPath)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Identity document not found");
        }

        long size = Files.size(resolvedDocumentPath);
        if (size == 0 || size > MAX_DOCUMENT_SIZE) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Identity document not found");
        }

        String contentType = doctor.getIdentityDocumentContentType();
        if (contentType == null || !Set.of("application/pdf", "image/jpeg", "image/png")
                .contains(contentType.toLowerCase(Locale.ROOT))) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Identity document not found");
        }

        byte[] content = Files.readAllBytes(resolvedDocumentPath);
        if (!hasValidDocumentSignature(content, contentType)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Identity document not found");
        }

        return new IdentityDocument(content, contentType, sanitizeFilename(doctor.getIdentityDocumentOriginalName()));
    }

    // Submit / resubmit doctor profile
    public DoctorProfileResponse submitProfile(
            String email,
            String phone,
            String specialization,
            String medicalRegistrationNumber,
            MultipartFile identityDocument) throws IOException {

        Doctor doctor = getDoctorByEmail(email);

        if (phone == null || phone.isBlank()) {
            throw new IllegalArgumentException(
                    "Phone number is required");
        }

        if (specialization == null || specialization.isBlank()) {
            throw new IllegalArgumentException(
                    "Specialization is required");
        }

        if (medicalRegistrationNumber == null
                || medicalRegistrationNumber.isBlank()) {
            throw new IllegalArgumentException(
                    "Medical registration number is required");
        }

        validateDocument(identityDocument);

        String registrationNumber =
                medicalRegistrationNumber.trim();

        boolean registrationChanged =
                doctor.getMedicalRegistrationNumber() == null
                || !doctor.getMedicalRegistrationNumber()
                        .equalsIgnoreCase(registrationNumber);

        if (registrationChanged
                && doctorRepository
                        .existsByMedicalRegistrationNumber(
                                registrationNumber)) {

            throw new IllegalArgumentException(
                    "Medical registration number is already registered");
        }

        Files.createDirectories(DOCUMENT_DIRECTORY);

        String originalName =
                identityDocument.getOriginalFilename();

        String extension = getExtension(originalName);

        String storedFileName =
                UUID.randomUUID() + extension;

        Path destination =
                DOCUMENT_DIRECTORY
                        .resolve(storedFileName)
                        .normalize();

        if (!destination.getParent().equals(DOCUMENT_DIRECTORY)) {
            throw new IllegalArgumentException(
                    "Invalid document path");
        }

        Files.copy(
                identityDocument.getInputStream(),
                destination);

        doctor.setPhone(phone.trim());
        doctor.setSpecialization(specialization.trim());
        doctor.setMedicalRegistrationNumber(registrationNumber);

        // Phone OTP verification is not implemented yet
        doctor.setPhoneVerified(false);

        // Every new submission goes for admin review
        doctor.setApprovalStatus(
                DoctorApprovalStatus.PENDING_REVIEW);

        doctor.setRejectionReason(null);

        doctor.setIdentityDocumentReference(
                destination.toString());

        doctor.setIdentityDocumentOriginalName(
                sanitizeFilename(originalName));

        doctor.setIdentityDocumentContentType(
                identityDocument.getContentType());

        doctor.setIdentityDocumentSize(
                identityDocument.getSize());

        doctor.setSubmittedAt(LocalDateTime.now());

        Doctor savedDoctor =
                doctorRepository.save(doctor);

        return toProfileResponse(savedDoctor);
    }

    // Find doctor using logged-in user's email
    private Doctor getDoctorByEmail(String email) {

        var user = userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new IllegalArgumentException("User not found"));

        return doctorRepository.findByUserId(user.getId())
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "No doctor profile linked to this account"));
    }

    private void validateDocument(MultipartFile document) throws IOException {

        if (document == null || document.isEmpty()) {
            throw new IllegalArgumentException(
                    "Identity document is required");
        }

        if (document.getSize() > MAX_DOCUMENT_SIZE) {
            throw new IllegalArgumentException(
                    "Identity document must be 5 MB or smaller");
        }

        String contentType = document.getContentType();

        if (!"application/pdf".equalsIgnoreCase(contentType)
                && !"image/jpeg".equalsIgnoreCase(contentType)
                && !"image/png".equalsIgnoreCase(contentType)) {

            throw new IllegalArgumentException(
                    "Only PDF, JPG, and PNG documents are allowed");
        }

        if (!hasValidDocumentSignature(document.getBytes(), contentType)) {
            throw new IllegalArgumentException("The uploaded identity document is not a valid PDF, JPG, or PNG file");
        }
    }

    private boolean hasValidDocumentSignature(byte[] content, String contentType) {
        if ("application/pdf".equalsIgnoreCase(contentType)) {
            return content.length >= 5
                    && content[0] == '%' && content[1] == 'P' && content[2] == 'D'
                    && content[3] == 'F' && content[4] == '-';
        }
        if ("image/png".equalsIgnoreCase(contentType)) {
            return content.length >= 8
                    && (content[0] & 0xff) == 0x89 && content[1] == 'P' && content[2] == 'N'
                    && content[3] == 'G' && content[4] == 0x0d && content[5] == 0x0a
                    && content[6] == 0x1a && content[7] == 0x0a;
        }
        if ("image/jpeg".equalsIgnoreCase(contentType)) {
            return content.length >= 3
                    && (content[0] & 0xff) == 0xff && (content[1] & 0xff) == 0xd8
                    && (content[2] & 0xff) == 0xff;
        }
        return false;
    }

    private String getExtension(String filename) {

        if (filename == null || filename.isBlank()) {
            return "";
        }

        int index = filename.lastIndexOf('.');

        if (index < 0) {
            return "";
        }

        String extension =
                filename.substring(index).toLowerCase();

        if (extension.equals(".pdf")
                || extension.equals(".jpg")
                || extension.equals(".jpeg")
                || extension.equals(".png")) {

            return extension;
        }

        return "";
    }

    private String sanitizeFilename(String filename) {

        if (filename == null || filename.isBlank()) {
            return "identity-document";
        }

        return Paths.get(filename)
                .getFileName()
                .toString();
    }

    private DoctorProfileResponse toProfileResponse(
            Doctor doctor) {

        return DoctorProfileResponse.builder()
                .id(doctor.getId())
                .fullName(doctor.getUser().getFullName())
                .email(doctor.getUser().getEmail())
                .phone(doctor.getPhone())
                .specialization(doctor.getSpecialization())
                .department(doctor.getDepartment())
                .medicalRegistrationNumber(
                        doctor.getMedicalRegistrationNumber())
                .phoneVerified(doctor.isPhoneVerified())
                .approvalStatus(
                        doctor.getApprovalStatus())
                .rejectionReason(
                        doctor.getRejectionReason())
                .identityDocumentSubmitted(
                        doctor.getIdentityDocumentReference() != null)
                .identityDocumentOriginalName(
                        doctor.getIdentityDocumentOriginalName())
                .submittedAt(doctor.getSubmittedAt())
                .build();
    }

    public record IdentityDocument(byte[] content, String contentType, String filename) {
    }
}