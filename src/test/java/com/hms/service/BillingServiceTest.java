package com.hms.service;

import com.hms.dto.VerifyRazorpayPaymentRequest;
import com.hms.dto.RazorpayOrderResponse;
import com.hms.entity.Invoice;
import com.hms.entity.Patient;
import com.hms.entity.User;
import com.hms.repository.AppointmentRepository;
import com.hms.repository.InvoiceRepository;
import com.hms.repository.PatientRepository;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class BillingServiceTest {

    @Test
    void verifyPatientPayment_marksInvoicePaidWhenGatewayAmountMatches() throws Exception {
        InvoiceRepository invoiceRepository = mock(InvoiceRepository.class);
        RestClient.Builder restClientBuilder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restClientBuilder).build();
        BillingService billingService = new BillingService(
                invoiceRepository,
                mock(PatientRepository.class),
                mock(AppointmentRepository.class),
                restClientBuilder
        );
        String keySecret = "billing-test-secret";
        ReflectionTestUtils.setField(billingService, "razorpayKeyId", "rzp_test_key");
        ReflectionTestUtils.setField(billingService, "razorpayKeySecret", keySecret);

        Invoice invoice = Invoice.builder()
                .id(42L)
                .invoiceNumber("INV-TEST-42")
                .patient(Patient.builder()
                        .id(7L)
                        .user(User.builder()
                                .fullName("Test Patient")
                                .email("patient@example.com")
                                .build())
                        .build())
                .amountPaise(Long.valueOf(25_000L))
                .currency("INR")
                .description("Consultation")
                .gatewayOrderId("order_test_42")
                .build();
        when(invoiceRepository.findByIdForUpdate(42L)).thenReturn(Optional.of(invoice));
        when(invoiceRepository.save(invoice)).thenReturn(invoice);
        server.expect(requestTo("https://api.razorpay.com/v1/payments/pay_test_42"))
                .andExpect(method(HttpMethod.GET))
                .andRespond(withSuccess("""
                        {
                          "id": "pay_test_42",
                          "order_id": "order_test_42",
                          "status": "captured",
                          "amount": 25000,
                          "currency": "INR"
                        }
                        """, MediaType.APPLICATION_JSON));

        VerifyRazorpayPaymentRequest request = new VerifyRazorpayPaymentRequest(
                "order_test_42",
                "pay_test_42",
                createSignature("order_test_42|pay_test_42", keySecret)
        );

        var result = billingService.verifyPatientPayment("patient@example.com", 42L, request);

        assertThat(result.status()).isEqualTo(Invoice.Status.PAID);
        assertThat(result.amountPaise()).isEqualTo(25_000L);
        assertThat(invoice.getGatewayPaymentId()).isEqualTo("pay_test_42");
        assertThat(invoice.getPaidAt()).isNotNull();
        verify(invoiceRepository).save(invoice);
        server.verify();
    }

    @Test
    void createPaymentOrder_recreatesOrderAfterGatewayKeyChanges() {
        InvoiceRepository invoiceRepository = mock(InvoiceRepository.class);
        RestClient.Builder restClientBuilder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(restClientBuilder).build();
        BillingService billingService = new BillingService(
                invoiceRepository,
                mock(PatientRepository.class),
                mock(AppointmentRepository.class),
                restClientBuilder
        );
        ReflectionTestUtils.setField(billingService, "razorpayKeyId", "rzp_test_new");
        ReflectionTestUtils.setField(billingService, "razorpayKeySecret", "new-test-secret");

        Invoice invoice = Invoice.builder()
                .id(42L)
                .invoiceNumber("INV-TEST-42")
                .patient(Patient.builder()
                        .id(7L)
                        .user(User.builder()
                                .fullName("Test Patient")
                                .email("patient@example.com")
                                .build())
                        .build())
                .amountPaise(25_000L)
                .currency("INR")
                .description("Consultation")
                .gatewayOrderId("order_test_old")
                .gatewayKeyId("rzp_test_old")
                .build();
        when(invoiceRepository.findByIdForUpdate(42L)).thenReturn(Optional.of(invoice));
        when(invoiceRepository.save(invoice)).thenReturn(invoice);
        server.expect(requestTo("https://api.razorpay.com/v1/orders"))
                .andExpect(method(HttpMethod.POST))
                .andRespond(withSuccess("""
                        {
                          "id": "order_test_new",
                          "amount": 25000,
                          "currency": "INR"
                        }
                        """, MediaType.APPLICATION_JSON));

        RazorpayOrderResponse result = billingService.createPaymentOrder(42L);

        assertThat(result.keyId()).isEqualTo("rzp_test_new");
        assertThat(result.orderId()).isEqualTo("order_test_new");
        assertThat(invoice.getGatewayOrderId()).isEqualTo("order_test_new");
        assertThat(invoice.getGatewayKeyId()).isEqualTo("rzp_test_new");
        verify(invoiceRepository).save(invoice);
        server.verify();
    }

    private String createSignature(String payload, String keySecret) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(keySecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return HexFormat.of().formatHex(mac.doFinal(payload.getBytes(StandardCharsets.UTF_8)));
    }
}
