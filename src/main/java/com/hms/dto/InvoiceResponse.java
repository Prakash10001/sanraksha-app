package com.hms.dto;

import com.hms.entity.Invoice;

import java.time.LocalDateTime;

public record InvoiceResponse(
        Long id,
        String invoiceNumber,
        Long patientId,
        String patientName,
        String patientEmail,
        Long appointmentId,
        Long amountPaise,
        String currency,
        String description,
        Invoice.Status status,
        LocalDateTime createdAt,
        LocalDateTime paidAt
) {
}
