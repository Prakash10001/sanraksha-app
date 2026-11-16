package com.hms.service;

import com.hms.dto.UpdatePatientProfileRequest;
import com.hms.dto.PatientHealthInfoRequest;
import com.hms.entity.Patient;
import com.hms.entity.Role;
import com.hms.entity.User;
import com.hms.repository.PatientRepository;
import com.hms.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentCaptor.forClass;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PatientServiceTest {

    @Mock
    private PatientRepository patientRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private PatientService patientService;

    @Test
    void updateMyProfile_shouldSaveDetailsForAuthenticatedPatient() {
        User user = User.builder()
                .id(4L)
                .fullName("Anita Sharma")
                .email("anita@example.com")
                .role(Role.PATIENT)
                .build();
        Patient patient = Patient.builder()
                .id(9L)
                .user(user)
                .build();
        UpdatePatientProfileRequest request = new UpdatePatientProfileRequest();
        request.setFullName("Anita Sharma Updated");
        request.setPhone("+1 555 123 4567");
        request.setGender("Female");
        request.setDateOfBirth(LocalDate.of(1990, 5, 20));
        request.setBloodGroup("O+");
        request.setAddress("12 Main Street");

        when(userRepository.findByEmail("anita@example.com")).thenReturn(Optional.of(user));
        when(patientRepository.findByUserId(4L)).thenReturn(Optional.of(patient));
        when(patientRepository.save(patient)).thenReturn(patient);

        var response = patientService.updateMyProfile("anita@example.com", request);

        verify(patientRepository).save(patient);
        assertThat(user.getFullName()).isEqualTo("Anita Sharma Updated");
        assertThat(patient.getPhone()).isEqualTo("+1 555 123 4567");
        assertThat(patient.getGender()).isEqualTo("Female");
        assertThat(patient.getDateOfBirth()).isEqualTo(LocalDate.of(1990, 5, 20));
        assertThat(patient.getBloodGroup()).isEqualTo("O+");
        assertThat(patient.getAddress()).isEqualTo("12 Main Street");
        assertThat(response.phone()).isEqualTo(patient.getPhone());
        assertThat(response.gender()).isEqualTo(patient.getGender());
        assertThat(response.dateOfBirth()).isEqualTo(patient.getDateOfBirth());
        assertThat(response.bloodGroup()).isEqualTo(patient.getBloodGroup());
        assertThat(response.address()).isEqualTo(patient.getAddress());
    }

    @Test
    void getPatientByEmail_shouldCreateLinkedProfile_whenExistingPatientHasNoProfile() {
        User user = User.builder()
                .id(4L)
                .fullName("Anita Sharma")
                .email("anita@example.com")
                .role(Role.PATIENT)
                .mustResetPassword(true)
                .build();
        Patient savedPatient = Patient.builder().id(10L).user(user).mustResetPassword(true).build();

        when(userRepository.findByEmail("anita@example.com")).thenReturn(Optional.of(user));
        when(patientRepository.findByUserId(4L)).thenReturn(Optional.empty());
        when(patientRepository.save(org.mockito.ArgumentMatchers.any(Patient.class))).thenReturn(savedPatient);

        Patient result = patientService.getPatientByEmail("anita@example.com");

        var patientCaptor = forClass(Patient.class);
        verify(patientRepository).save(patientCaptor.capture());
        assertThat(result).isSameAs(savedPatient);
        assertThat(patientCaptor.getValue().getUser()).isSameAs(user);
        assertThat(patientCaptor.getValue().isMustResetPassword()).isTrue();
    }

    @Test
    void getPatientByEmail_shouldNotCreateProfileForNonPatientUser() {
        User user = User.builder()
                .id(5L)
                .email("doctor@example.com")
                .role(Role.DOCTOR)
                .build();
        when(userRepository.findByEmail("doctor@example.com")).thenReturn(Optional.of(user));
        when(patientRepository.findByUserId(5L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> patientService.getPatientByEmail("doctor@example.com"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("No patient profile linked to this account");
        verify(patientRepository, never()).save(org.mockito.ArgumentMatchers.any(Patient.class));
    }

    @Test
    void updateMyHealthInfo_shouldSavePatientReportedDetails() {
        User user = User.builder()
                .id(4L)
                .fullName("Anita Sharma")
                .email("anita@example.com")
                .role(Role.PATIENT)
                .build();
        Patient patient = Patient.builder().id(9L).user(user).build();
        PatientHealthInfoRequest request = new PatientHealthInfoRequest();
        request.setReportedAllergies("  Penicillin  ");
        request.setReportedConditions("Asthma");

        when(userRepository.findByEmail("anita@example.com")).thenReturn(Optional.of(user));
        when(patientRepository.findByUserId(4L)).thenReturn(Optional.of(patient));
        when(patientRepository.save(patient)).thenReturn(patient);

        var response = patientService.updateMyHealthInfo("anita@example.com", request);

        verify(patientRepository).save(patient);
        assertThat(response.patientId()).isEqualTo(9L);
        assertThat(response.reportedAllergies()).isEqualTo("Penicillin");
        assertThat(response.reportedConditions()).isEqualTo("Asthma");
        assertThat(response.updatedAt()).isNotNull();
    }

    @Test
    void updateMyHealthInfo_shouldClearBlankPatientReportedDetails() {
        User user = User.builder()
                .id(4L)
                .email("anita@example.com")
                .role(Role.PATIENT)
                .build();
        Patient patient = Patient.builder()
                .id(9L)
                .user(user)
                .reportedAllergies("Penicillin")
                .reportedConditions("Asthma")
                .build();
        PatientHealthInfoRequest request = new PatientHealthInfoRequest();
        request.setReportedAllergies(" ");
        request.setReportedConditions(null);

        when(userRepository.findByEmail("anita@example.com")).thenReturn(Optional.of(user));
        when(patientRepository.findByUserId(4L)).thenReturn(Optional.of(patient));
        when(patientRepository.save(patient)).thenReturn(patient);

        var response = patientService.updateMyHealthInfo("anita@example.com", request);

        assertThat(response.reportedAllergies()).isNull();
        assertThat(response.reportedConditions()).isNull();
    }
}
