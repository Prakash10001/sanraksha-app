package com.hms.dto;

public record RazorpayOrderResponse(
        String keyId,
        String orderId,
        Long amountPaise,
        String currency,
        String invoiceNumber,
        String patientName,
        String patientEmail
) {
}
