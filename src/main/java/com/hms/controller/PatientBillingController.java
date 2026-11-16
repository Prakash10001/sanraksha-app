package com.hms.controller;

import com.hms.dto.InvoiceResponse;
import com.hms.dto.RazorpayConfigResponse;
import com.hms.dto.RazorpayOrderResponse;
import com.hms.dto.VerifyRazorpayPaymentRequest;
import com.hms.service.BillingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/patient/billing")
@RequiredArgsConstructor
public class PatientBillingController {

    private final BillingService billingService;

    @GetMapping("/config")
    public RazorpayConfigResponse billingConfig() {
        return billingService.getGatewayConfig();
    }

    @GetMapping("/invoices")
    public List<InvoiceResponse> invoices(Principal principal) {
        return billingService.getPatientInvoices(principal.getName());
    }

    @PostMapping("/invoices/{invoiceId}/payment-order")
    public RazorpayOrderResponse createPaymentOrder(
            Principal principal,
            @PathVariable Long invoiceId) {
        return billingService.createPatientPaymentOrder(principal.getName(), invoiceId);
    }

    @PostMapping("/invoices/{invoiceId}/verify-payment")
    public InvoiceResponse verifyPayment(
            Principal principal,
            @PathVariable Long invoiceId,
            @Valid @RequestBody VerifyRazorpayPaymentRequest request) {
        return billingService.verifyPatientPayment(principal.getName(), invoiceId, request);
    }
}
