package com.hms.service;

import jakarta.mail.internet.MimeMessage;
import jakarta.mail.Session;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Properties;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EmailServiceTest {

    @Mock
    private JavaMailSender mailSender;

    @InjectMocks
    private EmailService emailService;

    @BeforeEach
    void setSenderEmail() {
        ReflectionTestUtils.setField(emailService, "senderEmail", "mailbox@example.com");
    }

    @Test
    void sendWelcomeEmail_shouldUseProfessionalBrandingAndStructuredLayout() throws Exception {
        Session session = Session.getInstance(new Properties());
        MimeMessage mimeMessage = new MimeMessage(session);
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);

        doAnswer(invocation -> {
            MimeMessage message = invocation.getArgument(0);
            String html = (String) message.getContent();
            assertThat(html).contains("Sanraksha");
            assertThat(html).contains("#176b87");
            assertThat(html).contains("Welcome aboard");
            assertThat(html).contains("Get started");
            assertThat(html).contains("Patient portal");
            return null;
        }).when(mailSender).send(any(MimeMessage.class));

        emailService.sendWelcomeEmail("patient@example.com", "Aisha Patel");

        ArgumentCaptor<MimeMessage> captor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender).send(captor.capture());
        assertThat(captor.getValue().getSubject()).isEqualTo("Welcome to Sanraksha");
        assertThat(captor.getValue().getFrom()[0].toString()).contains("mailbox@example.com");
    }

    @Test
    void sendAppointmentUpdateEmail_shouldSendProfessionalHtmlConfirmation() throws Exception {
        Session session = Session.getInstance(new Properties());
        MimeMessage mimeMessage = new MimeMessage(session);
        when(mailSender.createMimeMessage()).thenReturn(mimeMessage);

        emailService.sendAppointmentUpdateEmail(
                "patient@example.com",
                "Aisha Patel",
                "Dr. Rao",
                LocalDateTime.of(2026, 10, 14, 10, 30),
                "confirmed"
        );

        ArgumentCaptor<MimeMessage> captor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender).send(captor.capture());
        MimeMessage sentMessage = captor.getValue();
        assertThat(sentMessage.getSubject()).isEqualTo("Appointment Confirmed | Sanraksha");
        assertThat(sentMessage.getContentType()).contains("text/html");
        String html = (String) sentMessage.getContent();
        assertThat(html).contains("Your appointment is confirmed");
        assertThat(html).contains("Aisha Patel");
        assertThat(html).contains("Dr. Rao");
        assertThat(html).contains("October 14, 2026 at 10:30 AM");
        assertThat(html).contains("Open patient portal");
    }

    @Test
    void sendAppointmentUpdateEmail_shouldSupportNewBookingRequests() throws Exception {
        Session session = Session.getInstance(new Properties());
        when(mailSender.createMimeMessage()).thenReturn(new MimeMessage(session));

        emailService.sendAppointmentUpdateEmail(
                "patient@example.com",
                "Aisha Patel",
                "Dr. Rao",
                LocalDateTime.of(2026, 10, 14, 10, 30),
                "requested"
        );

        ArgumentCaptor<MimeMessage> captor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender).send(captor.capture());
        assertThat(captor.getValue().getSubject()).isEqualTo("Appointment Request Received | Sanraksha");
        assertThat((String) captor.getValue().getContent())
                .contains("Your appointment request has been received and is pending confirmation");
    }
}
