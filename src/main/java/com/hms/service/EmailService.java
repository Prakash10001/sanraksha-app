package com.hms.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);
    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String senderEmail;

    @Value("${app.reset-url}")
    private String resetUrl;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendPasswordResetEmail(String toEmail, String token) {
                String resetLink = resetUrl + "?token=" + token;
                String html = """
                                <!doctype html>
                                <html lang="en">
                                <body style="margin:0;background:#f4f7fb;font-family:Arial,sans-serif;color:#172033;">
                                    <div style="max-width:560px;margin:32px auto;padding:0 16px;">
                                        <div style="background:#176b87;padding:24px 32px;color:#fff;border-radius:12px 12px 0 0;">
                                            <h1 style="margin:0;font-size:24px;">Sanraksha</h1>
                                            <p style="margin:8px 0 0;color:#dff5fb;">Hospital Management System</p>
                                        </div>
                                        <div style="background:#fff;padding:32px;border-radius:0 0 12px 12px;box-shadow:0 4px 18px #17203318;">
                                            <h2 style="margin-top:0;">Reset your password</h2>
                                            <p>We received a request to reset the password for your account.</p>
                                            <p style="margin:28px 0;text-align:center;">
                                                <a href="%s" style="display:inline-block;background:#176b87;color:#fff;text-decoration:none;padding:14px 24px;border-radius:7px;font-weight:bold;">Reset password</a>
                                            </p>
                                            <p style="font-size:14px;color:#526174;">This link expires in 30 minutes and can only be used once.</p>
                                            <p style="font-size:13px;color:#718096;word-break:break-all;">If the button does not work, open: %s</p>
                                            <hr style="border:0;border-top:1px solid #e6ebf1;margin:24px 0;">
                                            <p style="font-size:13px;color:#718096;margin-bottom:0;">If you did not request this, you can safely ignore this email.</p>
                                        </div>
                                    </div>
                                </body>
                                </html>
                                """.formatted(resetLink, resetLink);

                try {
                        MimeMessage message = mailSender.createMimeMessage();
                        MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8");
                        helper.setTo(toEmail);
                        helper.setFrom(senderEmail);
                        helper.setSubject("Reset your Sanraksha password");
                        helper.setText(html, true);
                        mailSender.send(message);
                } catch (MessagingException exception) {
                        throw new IllegalStateException("Unable to create password reset email", exception);
                }
    }

    public void sendWelcomeEmail(String toEmail, String fullName) {
        log.info("Sending welcome email to {}", toEmail);
        String loginLink = frontendUrl != null ? frontendUrl : "http://localhost:5173";
        String html = """
                <!doctype html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Welcome to Sanraksha</title>
                </head>
                <body style="margin:0;padding:0;background:#eef4f7;font-family:Arial,Helvetica,sans-serif;color:#172033;">
                    <div style="max-width:620px;margin:32px auto;padding:0 18px;">
                        <div style="background:#176b87;padding:28px 32px 22px;border-radius:18px 18px 0 0;">
                            <table role="presentation" width="100%%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                                <tr>
                                    <td style="padding:0;">
                                        <div style="font-size:28px;font-weight:700;letter-spacing:0.5px;color:#ffffff;">Sanraksha</div>
                                        <div style="font-size:13px;line-height:1.5;color:#d9eff6;margin-top:8px;letter-spacing:0.6px;text-transform:uppercase;">Hospital Management System</div>
                                    </td>
                                </tr>
                            </table>
                        </div>

                        <div style="background:#ffffff;padding:32px 32px 24px;border-radius:0 0 18px 18px;box-shadow:0 10px 28px rgba(23,32,51,0.08);">
                            <div style="font-size:12px;font-weight:700;color:#176b87;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:18px;">Welcome aboard</div>
                            <h2 style="margin:0 0 14px;font-size:30px;line-height:1.25;color:#172033;">Hello, %s</h2>
                            <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#435267;">
                                Your Sanraksha account has been created successfully and you are now ready to manage your healthcare journey with confidence.
                            </p>

                            <div style="background:#f2f8fb;border:1px solid #dfeef5;border-radius:12px;padding:18px 20px;margin:24px 0;">
                                <p style="margin:0 0 10px;font-size:15px;line-height:1.6;color:#2d3d52;">
                                    You can now access your patient portal, manage appointments, review medical records, and stay connected with your care team in one secure place.
                                </p>
                            </div>

                            <p style="margin:0 0 26px;text-align:center;">
                                <a href="%s" style="display:inline-block;background:#176b87;color:#ffffff;text-decoration:none;padding:15px 28px;border-radius:10px;font-size:15px;font-weight:700;letter-spacing:0.2px;">Get started</a>
                            </p>

                            <div style="border-top:1px solid #e8edf1;padding-top:20px;margin-top:8px;">
                                <p style="margin:0 0 12px;font-size:14px;line-height:1.7;color:#4a5d74;">
                                    <strong style="color:#172033;">Patient portal:</strong> %s
                                </p>
                                <p style="margin:0 0 4px;font-size:13px;line-height:1.7;color:#6f8192;">
                                    Need help? Contact our support team and we’ll be happy to assist you.
                                </p>
                            </div>
                        </div>

                        <div style="padding:18px 8px 0;text-align:center;font-size:12px;color:#73849b;line-height:1.6;">
                            © 2026 Sanraksha • Secure healthcare operations
                        </div>
                    </div>
                </body>
                </html>
                """.formatted(fullName, loginLink, loginLink);

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8");
            helper.setTo(toEmail);
            helper.setFrom(senderEmail);
            helper.setSubject("Welcome to Sanraksha");
            helper.setText(html, true);
            mailSender.send(message);
            log.info("Welcome email sent successfully to {}", toEmail);
        } catch (MessagingException exception) {
            log.error("Unable to create welcome email for {}", toEmail, exception);
            throw new IllegalStateException("Unable to create welcome email", exception);
        } catch (RuntimeException exception) {
            log.error("SMTP failed while sending welcome email to {}", toEmail, exception);
            throw exception;
        }
    }

    public void sendAppointmentUpdateEmail(String toEmail, String patientName, String doctorName,
                                           LocalDateTime appointmentDate, String action) {
        String formattedDate = appointmentDate.format(DateTimeFormatter.ofPattern("MMMM d, yyyy 'at' h:mm a"));
        String actionLabel = switch (action.toLowerCase()) {
            case "requested" -> "Request Received";
            case "confirmed" -> "Confirmed";
            case "cancelled" -> "Cancelled";
            case "rescheduled" -> "Rescheduled";
            default -> throw new IllegalArgumentException("Unsupported appointment update action");
        };
        String statusMessage = switch (action.toLowerCase()) {
            case "requested" -> "request has been received and is pending confirmation";
            case "confirmed" -> "is confirmed";
            case "cancelled" -> "is cancelled";
            case "rescheduled" -> "has been rescheduled";
            default -> throw new IllegalArgumentException("Unsupported appointment update action");
        };
        String subject = "Appointment " + actionLabel + " | Sanraksha";
        String portalUrl = frontendUrl != null ? frontendUrl : "http://localhost:5173";
        String html = """
                <!doctype html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Appointment %s</title>
                </head>
                <body style="margin:0;padding:0;background:#f3f6f8;font-family:Arial,Helvetica,sans-serif;color:#24313d;">
                    <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#f3f6f8;">
                        <tr><td align="center" style="padding:32px 16px;">
                            <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="max-width:600px;border-collapse:collapse;background:#ffffff;border:1px solid #dfe5e9;">
                                <tr><td style="padding:22px 30px;background:#176b70;color:#ffffff;">
                                    <div style="font-size:20px;font-weight:700;">Sanraksha</div>
                                    <div style="margin-top:5px;font-size:12px;color:#e2f1f1;">HOSPITAL MANAGEMENT SYSTEM</div>
                                </td></tr>
                                <tr><td style="padding:32px 30px 16px;">
                                    <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#176b70;text-transform:uppercase;">Appointment update</p>
                                    <h1 style="margin:0 0 18px;font-size:25px;line-height:1.3;color:#1f2d38;">Your appointment %s</h1>
                                    <p style="margin:0;font-size:15px;line-height:1.65;color:#455461;">Hello %s, your appointment details are shown below.</p>
                                </td></tr>
                                <tr><td style="padding:8px 30px 26px;">
                                    <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #dfe5e9;">
                                        <tr><td style="width:34%%;padding:13px 16px;border-bottom:1px solid #dfe5e9;font-size:13px;color:#667580;">Status</td><td style="padding:13px 16px;border-bottom:1px solid #dfe5e9;font-size:14px;font-weight:700;color:#24313d;">%s</td></tr>
                                        <tr><td style="padding:13px 16px;border-bottom:1px solid #dfe5e9;font-size:13px;color:#667580;">Doctor</td><td style="padding:13px 16px;border-bottom:1px solid #dfe5e9;font-size:14px;color:#24313d;">%s</td></tr>
                                        <tr><td style="padding:13px 16px;font-size:13px;color:#667580;">Date and time</td><td style="padding:13px 16px;font-size:14px;color:#24313d;">%s</td></tr>
                                    </table>
                                </td></tr>
                                <tr><td style="padding:0 30px 28px;font-size:14px;line-height:1.65;color:#455461;">
                                    View your appointment in the patient portal or contact the clinic if you have questions.
                                    <p style="margin:20px 0 0;"><a href="%s" style="display:inline-block;padding:12px 18px;background:#176b70;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;">Open patient portal</a></p>
                                </td></tr>
                                <tr><td style="padding:18px 30px;border-top:1px solid #e5eaed;font-size:12px;line-height:1.5;color:#75828c;">
                                    This is an automated appointment notification from Sanraksha. Please do not reply to this email.
                                </td></tr>
                            </table>
                        </td></tr>
                    </table>
                </body>
                </html>
                """.formatted(
                escapeHtml(actionLabel.toLowerCase()), escapeHtml(statusMessage),
                escapeHtml(patientName), escapeHtml(actionLabel), escapeHtml(doctorName),
                escapeHtml(formattedDate), escapeHtml(portalUrl)
        );

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, "UTF-8");
            helper.setTo(toEmail);
            helper.setFrom(senderEmail);
            helper.setSubject(subject);
            helper.setText(html, true);
            mailSender.send(message);
        } catch (MessagingException exception) {
            throw new IllegalStateException("Unable to create appointment notification email", exception);
        }
    }

    private String escapeHtml(String value) {
        return value.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }
}