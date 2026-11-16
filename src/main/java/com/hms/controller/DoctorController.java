package com.hms.controller;

import com.hms.dto.DoctorSummaryResponse;
import com.hms.dto.DoctorPatientResponse;
import com.hms.service.AppointmentService;
import com.hms.service.DoctorService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/doctors")
@RequiredArgsConstructor
public class DoctorController {

    private final DoctorService doctorService;
    private final AppointmentService appointmentService;

    @GetMapping
    public List<DoctorSummaryResponse> getAll() {
        return doctorService.getAll();
    }

    @GetMapping("/search")
    public List<DoctorSummaryResponse> search(@RequestParam String specialization) {
        return doctorService.searchBySpecialization(specialization);
    }

    @GetMapping("/me/patients")
    public List<DoctorPatientResponse> getMyPatients(Authentication authentication) {
        return appointmentService.getPatientsForDoctor(authentication.getName());
    }
}
