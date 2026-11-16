package com.hms.service;

import com.hms.config.JwtUtil;
import com.hms.dto.AuthResponse;
import com.hms.dto.LoginRequest;
import com.hms.entity.Doctor;
import com.hms.entity.Patient;
import com.hms.entity.Role;
import com.hms.entity.User;
import com.hms.repository.DoctorRepository;
import com.hms.repository.PatientRepository;
import com.hms.repository.PasswordResetTokenRepository;
import com.hms.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentCaptor.forClass;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private DoctorRepository doctorRepository;

    @Mock
    private PatientRepository patientRepository;

    @Mock
    private PasswordResetTokenRepository passwordResetTokenRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtUtil jwtUtil;

    @Mock
    private EmailService emailService;

    @InjectMocks
    private AuthService authService;

    @Test
    void login_shouldReturnMustResetPassword_whenUserRequiresPasswordReset() {
        User user = User.builder()
                .id(1L)
                .fullName("Anita Sharma")
                .email("anita.patient@example.com")
                .password("encoded")
                .role(Role.PATIENT)
                .mustResetPassword(true)
                .build();

        LoginRequest request = new LoginRequest();
        request.setEmail("anita.patient@example.com");
        request.setPassword("tempPassword123");

        when(userRepository.findByEmail("anita.patient@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("tempPassword123", "encoded")).thenReturn(true);
        when(jwtUtil.generateToken("anita.patient@example.com", "PATIENT")).thenReturn("jwt-token");
        when(patientRepository.findByUserId(1L)).thenReturn(Optional.of(Patient.builder().user(user).mustResetPassword(false).build()));

        AuthResponse response = authService.login(request);

        assertThat(response.getMustResetPassword()).isTrue();
        assertThat(response.getToken()).isEqualTo("jwt-token");
    }

    @Test
    void register_shouldPersistMustResetPassword_forPatient() {
        com.hms.dto.RegisterRequest request = new com.hms.dto.RegisterRequest();
        request.setFullName("Anita Sharma");
        request.setEmail("anita.patient@example.com");
        request.setPassword("TempPass123!");
        request.setRole(Role.PATIENT);
        request.setMustResetPassword(true);

        User savedUser = User.builder()
                .id(3L)
                .fullName("Anita Sharma")
                .email("anita.patient@example.com")
                .password("encoded")
                .role(Role.PATIENT)
                .mustResetPassword(true)
                .build();

        when(userRepository.existsByEmail("anita.patient@example.com")).thenReturn(false);
        when(passwordEncoder.encode("TempPass123!")).thenReturn("encoded");
        when(userRepository.save(org.mockito.ArgumentMatchers.any(User.class))).thenReturn(savedUser);
        when(jwtUtil.generateToken("anita.patient@example.com", "PATIENT")).thenReturn("jwt-patient");

        AuthResponse response = authService.register(request);

        assertThat(response.isMustResetPassword()).isTrue();
        assertThat(response.getToken()).isEqualTo("jwt-patient");
        verify(emailService).sendWelcomeEmail("anita.patient@example.com", "Anita Sharma");
    }

    @Test
    void register_shouldCreateDoctorProfileLinkedToUser_forDoctor() {
        com.hms.dto.RegisterRequest request = new com.hms.dto.RegisterRequest();
        request.setFullName("Dr. Anita Sharma");
        request.setEmail("anita.doctor@example.com");
        request.setPassword("SecurePass123!");
        request.setRole(Role.DOCTOR);
        request.setSpecialization("Cardiology");

        User savedUser = User.builder()
                .id(4L)
                .fullName("Dr. Anita Sharma")
                .email("anita.doctor@example.com")
                .password("encoded")
                .role(Role.DOCTOR)
                .build();

        when(userRepository.existsByEmail("anita.doctor@example.com")).thenReturn(false);
        when(passwordEncoder.encode("SecurePass123!")).thenReturn("encoded");
        when(userRepository.save(org.mockito.ArgumentMatchers.any(User.class))).thenReturn(savedUser);
        when(jwtUtil.generateToken("anita.doctor@example.com", "DOCTOR")).thenReturn("jwt-doctor");

        AuthResponse response = authService.register(request);

        var doctorCaptor = forClass(Doctor.class);
        verify(doctorRepository).save(doctorCaptor.capture());
        assertThat(doctorCaptor.getValue().getUser()).isSameAs(savedUser);
        assertThat(doctorCaptor.getValue().getSpecialization()).isEqualTo("Cardiology");
        assertThat(response.getRole()).isEqualTo("DOCTOR");
    }

    @Test
    void changePassword_shouldClearResetFlag_afterSuccessfulUpdate() {
        User user = User.builder()
                .id(2L)
                .fullName("Aisha Patel")
                .email("aisha.patient@example.com")
                .password("encoded")
                .role(Role.PATIENT)
                .mustResetPassword(true)
                .build();

        when(userRepository.findByEmail("aisha.patient@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.encode("newSecurePassword123")).thenReturn("newEncodedPassword");

        authService.changePassword("aisha.patient@example.com", "newSecurePassword123");

        assertThat(user.isMustResetPassword()).isFalse();
        assertThat(user.getPassword()).isEqualTo("newEncodedPassword");
    }
}
