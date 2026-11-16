package com.hms.controller;

import com.hms.dto.AppointmentRequest;
import com.hms.dto.RescheduleAppointmentRequest;
import com.hms.entity.Appointment;
import com.hms.service.AppointmentService;
import com.hms.service.DoctorService;
import com.hms.service.PatientService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/appointments")
@RequiredArgsConstructor
public class AppointmentController {

    private final AppointmentService appointmentService;
    private final DoctorService doctorService;
    private final PatientService patientService;

    @PostMapping
    public ResponseEntity<Appointment> book(Authentication auth, @Valid @RequestBody AppointmentRequest request) {
        String email = auth.getName(); // set by JwtAuthFilter
        return ResponseEntity.ok(appointmentService.book(email, request));
    }

    @GetMapping("/me")
    public List<Appointment> myAppointments(Authentication auth) {
        var patient = patientService.getPatientByEmail(auth.getName());
        return appointmentService.getForPatient(patient.getId());
    }

    @GetMapping("/doctor/me")
    public List<Appointment> myDoctorAppointments(Authentication auth) {
        var doctor = doctorService.getDoctorByEmail(auth.getName());
        return appointmentService.getForDoctor(doctor.getId());
    }

    @PatchMapping("/{id}/cancel")
    public Appointment cancel(Authentication auth, @PathVariable Long id) {
        return appointmentService.cancelForPatient(id, auth.getName());
    }

    @PutMapping("/{id}/status")
    public Appointment updateStatus(Authentication auth, @PathVariable Long id,
                                    @RequestParam Appointment.Status status) {
        return appointmentService.updateStatusForDoctor(id, status, auth.getName());
    }

    @PatchMapping("/{id}/reschedule")
    public Appointment reschedule(Authentication auth, @PathVariable Long id,
                                  @Valid @RequestBody RescheduleAppointmentRequest request) {
        return appointmentService.rescheduleForPatient(id, request.getAppointmentDate(), auth.getName());
    }
}
