package com.hms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "invoices")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Invoice {

    public enum Status { PENDING, PAID }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "invoice_number", nullable = false, unique = true, length = 24)
    private String invoiceNumber;

    @ManyToOne(optional = false)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @ManyToOne
    @JoinColumn(name = "appointment_id")
    private Appointment appointment;

    @Column(name = "amount_paise", nullable = false)
    private Long amountPaise;

    @Column(nullable = false, length = 3)
    @Builder.Default
    private String currency = "INR";

    @Column(nullable = false, length = 255)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    @Builder.Default
    private Status status = Status.PENDING;

    @Column(name = "gateway_order_id", unique = true, length = 64)
    private String gatewayOrderId;

    @Column(name = "gateway_key_id", length = 64)
    private String gatewayKeyId;

    @Column(name = "gateway_payment_id", unique = true, length = 64)
    private String gatewayPaymentId;

    @Builder.Default
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "paid_at")
    private LocalDateTime paidAt;
}
