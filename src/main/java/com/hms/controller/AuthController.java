package com.hms.controller;

import com.hms.dto.*;
import com.hms.repository.PasswordResetTokenRepository;
import com.hms.service.AuthService;
import com.hms.service.EmailService;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
//@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final PasswordResetTokenRepository tokenRepository;
    private final EmailService emailService;

    public AuthController(AuthService authService,
                          PasswordResetTokenRepository tokenRepository,
                          EmailService emailService) {
        this.authService = authService;
        this.tokenRepository = tokenRepository;
        this.emailService = emailService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody ForgotPasswordRequest request) {
    authService.requestPasswordReset(request.getEmail());
    return ResponseEntity.ok().build();
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody ResetPasswordRequest request) {
    try {
        authService.resetPassword(request.getToken(), request.getNewPassword());
        return ResponseEntity.ok().build();
    } catch (IllegalArgumentException e) {
        return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
    }
  }

    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(Authentication authentication,
                                            @Valid @RequestBody ChangePasswordRequest request) {
        try {
            authService.changePassword(authentication.getName(), request.getNewPassword());
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(new ErrorResponse(e.getMessage()));
        }
    }

        @GetMapping(value = "/browser-reset", produces = MediaType.TEXT_HTML_VALUE)
        public ResponseEntity<String> browserReset(@RequestParam String token) {
                String page = """
                                <!doctype html>
                                <html lang="en">
                                <head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Reset password</title></head>
                                <body style="margin:0;background:#f4f7fb;font-family:Arial,sans-serif;color:#172033;">
                                    <main style="max-width:420px;margin:72px auto;padding:16px;">
                                        <section style="background:#fff;padding:32px;border-radius:12px;box-shadow:0 4px 18px #17203318;">
                                            <h1 style="margin-top:0;color:#176b87;">Reset your password</h1>
                                            <p>Choose a new password for your Sanraksha account.</p>
                                            <form id="reset-form">
                                                <label for="password">New password</label>
                                                <input id="password" type="password" minlength="8" required style="display:block;box-sizing:border-box;width:100%%;margin:8px 0 18px;padding:12px;border:1px solid #cbd5e1;border-radius:6px;">
                                                <label for="confirm">Confirm password</label>
                                                <input id="confirm" type="password" minlength="8" required style="display:block;box-sizing:border-box;width:100%%;margin:8px 0 18px;padding:12px;border:1px solid #cbd5e1;border-radius:6px;">
                                                <button type="submit" style="width:100%%;padding:13px;border:0;border-radius:6px;background:#176b87;color:#fff;font-weight:bold;cursor:pointer;">Update password</button>
                                            </form>
                                            <p id="message" role="status"></p>
                                        </section>
                                    </main>
                                    <script>
                                        const form = document.getElementById('reset-form');
                                        const message = document.getElementById('message');
                                        form.addEventListener('submit', async (event) => {
                                            event.preventDefault();
                                            const password = document.getElementById('password').value;
                                            const confirm = document.getElementById('confirm').value;
                                            if (password !== confirm) {
                                                message.textContent = 'Passwords do not match.';
                                                message.style.color = '#b42318';
                                                return;
                                            }
                                            const response = await fetch('/api/auth/reset-password', {
                                                method: 'POST',
                                                headers: {'Content-Type': 'application/json'},
                                                body: JSON.stringify({token: '%s', newPassword: password})
                                            });
                                            message.textContent = response.ok ? 'Password updated. You can now sign in.' : 'This link is invalid or expired.';
                                            message.style.color = response.ok ? '#16794c' : '#b42318';
                                            if (response.ok) form.remove();
                                        });
                                    </script>
                                </body>
                                </html>
                                """.formatted(token);
                return ResponseEntity.ok().contentType(MediaType.TEXT_HTML).body(page);
        }
}
