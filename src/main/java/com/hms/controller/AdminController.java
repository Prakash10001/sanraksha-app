package com.hms.controller;

import com.hms.dto.AdminStatsResponse;
import com.hms.dto.AdminAppointmentRequest;
import com.hms.dto.AdminAppointmentResponse;
import com.hms.dto.AdminPatientResponse;
import com.hms.dto.AdminStaffResponse;
import com.hms.dto.AuthResponse;
import com.hms.dto.CreateInvoiceRequest;
import com.hms.dto.CreateLabStaffRequest;
import com.hms.dto.InvoiceResponse;
import com.hms.dto.LabStaffResponse;
import com.hms.dto.RazorpayConfigResponse;
import com.hms.dto.RazorpayOrderResponse;
import com.hms.dto.RecentPatientResponse;
import com.hms.dto.RegisterRequest;
import com.hms.dto.ScheduleItemResponse;
import com.hms.dto.VerifyRazorpayPaymentRequest;
import com.hms.service.BillingService;
import com.hms.entity.Role;
import com.hms.service.AdminService;
import com.hms.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.data.domain.Page;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;
    private final AuthService authService;
    private final BillingService billingService;

    @GetMapping("/stats")
    public AdminStatsResponse stats() {
        return adminService.getStats();
    }

    @GetMapping("/recent-patients")
    public List<RecentPatientResponse> recentPatients() {
        return adminService.getRecentPatients();
    }

    @GetMapping("/patients")
    public Page<AdminPatientResponse> patients(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "5") int size,
            @RequestParam(required = false) String search) {
        return adminService.getPatients(page, size, search);
    }

    @GetMapping("/patients/registered-today")
    public List<AdminPatientResponse> patientsRegisteredToday() {
        return adminService.getPatientsRegisteredToday();
    }

    @GetMapping("/patients/{patientId}/appointments")
    public List<AdminAppointmentResponse> patientAppointments(@PathVariable Long patientId) {
        return adminService.getPatientAppointments(patientId);
    }

    @GetMapping("/staff")
    public List<AdminStaffResponse> staff() {
        return adminService.getStaff();
    }

    @GetMapping("/billing/config")
    public RazorpayConfigResponse billingConfig() {
        return billingService.getGatewayConfig();
    }

    @GetMapping("/invoices")
    public List<InvoiceResponse> invoices() {
        return billingService.getInvoices();
    }

    @PostMapping("/invoices")
    public ResponseEntity<InvoiceResponse> createInvoice(@Valid @RequestBody CreateInvoiceRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(billingService.createInvoice(request));
    }

    @PostMapping("/invoices/{invoiceId}/payment-order")
    public RazorpayOrderResponse createPaymentOrder(@PathVariable Long invoiceId) {
        return billingService.createPaymentOrder(invoiceId);
    }

    @PostMapping("/invoices/{invoiceId}/verify-payment")
    public InvoiceResponse verifyPayment(
            @PathVariable Long invoiceId,
            @Valid @RequestBody VerifyRazorpayPaymentRequest request) {
        return billingService.verifyPayment(invoiceId, request);
    }

    @GetMapping("/today-schedule")
    public List<ScheduleItemResponse> todaySchedule() {
        return adminService.getTodaySchedule();
    }

    @GetMapping("/appointments")
    public List<AdminAppointmentResponse> appointments() {
        return adminService.getAppointments();
    }

    @GetMapping("/pending-appointments")
    public List<AdminAppointmentResponse> pendingAppointments() {
        return adminService.getPendingAppointments();
    }

    @PostMapping("/patients")
    public ResponseEntity<AuthResponse> createPatient(@Valid @RequestBody RegisterRequest request) {
        request.setRole(Role.PATIENT);
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/appointments")
    public ResponseEntity<AdminAppointmentResponse> bookAppointment(@Valid @RequestBody AdminAppointmentRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(adminService.bookAppointment(request));
    }

    @PostMapping("/lab-staff")
    public ResponseEntity<LabStaffResponse> createLabStaff(@Valid @RequestBody CreateLabStaffRequest request) {
        return ResponseEntity.ok(adminService.createLabStaff(request));
    }
}