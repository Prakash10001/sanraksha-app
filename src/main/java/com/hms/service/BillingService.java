package com.hms.service;

import com.hms.dto.CreateInvoiceRequest;
import com.hms.dto.InvoiceResponse;
import com.hms.dto.RazorpayConfigResponse;
import com.hms.dto.RazorpayOrderResponse;
import com.hms.dto.VerifyRazorpayPaymentRequest;
import com.hms.entity.Appointment;
import com.hms.entity.Invoice;
import com.hms.entity.Patient;
import com.hms.repository.AppointmentRepository;
import com.hms.repository.InvoiceRepository;
import com.hms.repository.PatientRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.security.GeneralSecurityException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class BillingService {

    private final InvoiceRepository invoiceRepository;
    private final PatientRepository patientRepository;
    private final AppointmentRepository appointmentRepository;
    private final RestClient.Builder restClientBuilder;

    @Value("${razorpay.key-id:}")
    private String razorpayKeyId;

    @Value("${razorpay.key-secret:}")
    private String razorpayKeySecret;

    @Transactional(readOnly = true)
    public RazorpayConfigResponse getGatewayConfig() {
        return new RazorpayConfigResponse(isGatewayConfigured(), isGatewayConfigured() ? razorpayKeyId : null);
    }

    @Transactional(readOnly = true)
    public List<InvoiceResponse> getInvoices() {
        return invoiceRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<InvoiceResponse> getPatientInvoices(String patientEmail) {
        return invoiceRepository.findByPatient_User_EmailIgnoreCaseOrderByCreatedAtDesc(patientEmail).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public InvoiceResponse createInvoice(CreateInvoiceRequest request) {
        String patientEmail = request.patientEmail().trim();
        Patient patient = patientRepository.findByUser_EmailIgnoreCase(patientEmail)
                .orElseThrow(() -> new IllegalArgumentException("No patient account was found for this email"));

        Appointment appointment = null;
        if (request.appointmentId() != null) {
            appointment = appointmentRepository.findById(request.appointmentId())
                    .orElseThrow(() -> new IllegalArgumentException("Appointment not found"));
            if (!appointment.getPatient().getId().equals(patient.getId())) {
                throw new IllegalArgumentException("The selected appointment does not belong to this patient");
            }
        }

        Invoice invoice = Invoice.builder()
                .invoiceNumber("INV-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .patient(patient)
                .appointment(appointment)
                .amountPaise(request.amountPaise())
                .description(request.description().trim())
                .build();
        return toResponse(invoiceRepository.save(invoice));
    }

    @Transactional
    public RazorpayOrderResponse createPaymentOrder(Long invoiceId) {
        return createPaymentOrder(getInvoice(invoiceId));
    }

    @Transactional
    public RazorpayOrderResponse createPatientPaymentOrder(String patientEmail, Long invoiceId) {
        return createPaymentOrder(getPatientInvoice(patientEmail, invoiceId));
    }

    private RazorpayOrderResponse createPaymentOrder(Invoice invoice) {
        if (invoice.getStatus() == Invoice.Status.PAID) {
            throw new IllegalArgumentException("This invoice has already been paid");
        }
        requireGatewayConfigured();

        if (invoice.getGatewayOrderId() != null && razorpayKeyId.equals(invoice.getGatewayKeyId())) {
            return toOrderResponse(invoice, invoice.getGatewayOrderId());
        }

        Map<String, Object> orderRequest = Map.of(
                "amount", invoice.getAmountPaise(),
                "currency", invoice.getCurrency(),
                "receipt", invoice.getInvoiceNumber()
        );

        RazorpayOrder order;
        try {
            order = razorpayClient().post()
                    .uri("/orders")
                    .body(orderRequest)
                    .retrieve()
                    .body(RazorpayOrder.class);
        } catch (RestClientResponseException exception) {
            throw new PaymentGatewayException("Razorpay could not create the order. Check the test API keys and retry.", exception);
        } catch (RestClientException exception) {
            throw new PaymentGatewayException("Unable to reach Razorpay. Check the backend network connection and retry.", exception);
        }

        if (order == null
                || order.id() == null
                || !invoice.getAmountPaise().equals(order.amount())
                || !invoice.getCurrency().equals(order.currency())) {
            throw new PaymentGatewayException("Razorpay returned an invalid order response.");
        }
        invoice.setGatewayOrderId(order.id());
        invoice.setGatewayKeyId(razorpayKeyId);
        invoiceRepository.save(invoice);
        return toOrderResponse(invoice, order.id());
    }

    private RazorpayOrderResponse toOrderResponse(Invoice invoice, String orderId) {
        return new RazorpayOrderResponse(
                razorpayKeyId,
                orderId,
                invoice.getAmountPaise(),
                invoice.getCurrency(),
                invoice.getInvoiceNumber(),
                invoice.getPatient().getUser().getFullName(),
                invoice.getPatient().getUser().getEmail()
        );
    }

    @Transactional
    public InvoiceResponse verifyPayment(Long invoiceId, VerifyRazorpayPaymentRequest request) {
        return verifyPayment(getInvoice(invoiceId), request);
    }

    @Transactional
    public InvoiceResponse verifyPatientPayment(
            String patientEmail,
            Long invoiceId,
            VerifyRazorpayPaymentRequest request) {
        return verifyPayment(getPatientInvoice(patientEmail, invoiceId), request);
    }

    private InvoiceResponse verifyPayment(Invoice invoice, VerifyRazorpayPaymentRequest request) {
        if (invoice.getStatus() == Invoice.Status.PAID) {
            if (request.razorpayPaymentId().equals(invoice.getGatewayPaymentId())) return toResponse(invoice);
            throw new IllegalArgumentException("This invoice has already been paid");
        }
        if (invoice.getGatewayOrderId() == null || !invoice.getGatewayOrderId().equals(request.razorpayOrderId())) {
            throw new IllegalArgumentException("The payment order does not match this invoice");
        }

        String expectedSignature = createSignature(request.razorpayOrderId(), request.razorpayPaymentId());
        byte[] expected = expectedSignature.getBytes(StandardCharsets.US_ASCII);
        byte[] actual = request.razorpaySignature().toLowerCase().getBytes(StandardCharsets.US_ASCII);
        if (!MessageDigest.isEqual(expected, actual)) {
            throw new IllegalArgumentException("Payment signature verification failed");
        }

        RazorpayPayment payment = fetchPayment(request.razorpayPaymentId());
        if (!request.razorpayOrderId().equals(payment.orderId())
                || !Objects.equals(payment.amount(), invoice.getAmountPaise())
                || !invoice.getCurrency().equals(payment.currency())) {
            throw new IllegalArgumentException("The payment details do not match this invoice");
        }

        if ("authorized".equals(payment.status())) payment = capturePayment(request.razorpayPaymentId(), invoice);
        if (!"captured".equals(payment.status())) {
            throw new IllegalArgumentException("Razorpay has not captured this payment");
        }

        invoice.setGatewayPaymentId(request.razorpayPaymentId());
        invoice.setStatus(Invoice.Status.PAID);
        invoice.setPaidAt(LocalDateTime.now());
        return toResponse(invoiceRepository.save(invoice));
    }

    private Invoice getInvoice(Long invoiceId) {
        return invoiceRepository.findByIdForUpdate(invoiceId)
                .orElseThrow(() -> new IllegalArgumentException("Invoice not found"));
    }

    private Invoice getPatientInvoice(String patientEmail, Long invoiceId) {
        Invoice invoice = getInvoice(invoiceId);
        if (invoice.getPatient() == null
                || invoice.getPatient().getUser() == null
                || !invoice.getPatient().getUser().getEmail().equalsIgnoreCase(patientEmail)) {
            throw new IllegalArgumentException("Invoice not found");
        }
        return invoice;
    }

    private InvoiceResponse toResponse(Invoice invoice) {
        Patient patient = invoice.getPatient();
        return new InvoiceResponse(
                invoice.getId(),
                invoice.getInvoiceNumber(),
                patient.getId(),
                patient.getUser().getFullName(),
                patient.getUser().getEmail(),
                invoice.getAppointment() == null ? null : invoice.getAppointment().getId(),
                invoice.getAmountPaise(),
                invoice.getCurrency(),
                invoice.getDescription(),
                invoice.getStatus(),
                invoice.getCreatedAt(),
                invoice.getPaidAt()
        );
    }

    private RazorpayPayment fetchPayment(String paymentId) {
        try {
            RazorpayPayment payment = razorpayClient().get()
                    .uri("/payments/{paymentId}", paymentId)
                    .retrieve()
                    .body(RazorpayPayment.class);
            if (payment == null) throw new PaymentGatewayException("Razorpay returned an invalid payment response.");
            return payment;
        } catch (RestClientResponseException exception) {
            throw new PaymentGatewayException("Razorpay could not verify the payment. Retry the verification.", exception);
        } catch (RestClientException exception) {
            throw new PaymentGatewayException("Unable to reach Razorpay to verify the payment.", exception);
        }
    }

    private RazorpayPayment capturePayment(String paymentId, Invoice invoice) {
        try {
            RazorpayPayment payment = razorpayClient().post()
                    .uri("/payments/{paymentId}/capture", paymentId)
                    .body(Map.of("amount", invoice.getAmountPaise(), "currency", invoice.getCurrency()))
                    .retrieve()
                    .body(RazorpayPayment.class);
            if (payment == null) throw new PaymentGatewayException("Razorpay returned an invalid capture response.");
            return payment;
        } catch (RestClientResponseException exception) {
            throw new PaymentGatewayException("Razorpay could not capture the payment. Check the gateway dashboard.", exception);
        } catch (RestClientException exception) {
            throw new PaymentGatewayException("Unable to reach Razorpay to capture the payment.", exception);
        }
    }

    private RestClient razorpayClient() {
        requireGatewayConfigured();
        return restClientBuilder
                .baseUrl("https://api.razorpay.com/v1")
                .defaultHeaders(headers -> headers.setBasicAuth(razorpayKeyId, razorpayKeySecret))
                .build();
    }

    private boolean isGatewayConfigured() {
        return razorpayKeyId != null && !razorpayKeyId.isBlank()
                && razorpayKeySecret != null && !razorpayKeySecret.isBlank();
    }

    private void requireGatewayConfigured() {
        if (!isGatewayConfigured()) {
            throw new PaymentGatewayException("Razorpay test keys are not configured on the backend.");
        }
    }

    private String createSignature(String orderId, String paymentId) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(razorpayKeySecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal((orderId + "|" + paymentId).getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException exception) {
            throw new PaymentGatewayException("Unable to verify the Razorpay signature.", exception);
        }
    }

    private record RazorpayOrder(String id, Long amount, String currency) {
    }

    private record RazorpayPayment(
            String id,
            @com.fasterxml.jackson.annotation.JsonProperty("order_id")
            String orderId,
            String status,
            Long amount,
            String currency
    ) {}
}
