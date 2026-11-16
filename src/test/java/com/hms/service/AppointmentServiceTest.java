package com.hms.service;

import com.hms.entity.Appointment;
import com.hms.entity.Doctor;
import com.hms.entity.Patient;
import com.hms.entity.User;
import com.hms.dto.DoctorPatientResponse;
import com.hms.dto.AppointmentRequest;
import com.hms.repository.AppointmentRepository;
import com.hms.repository.DoctorRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AppointmentServiceTest {

    @Mock
    private AppointmentRepository appointmentRepository;

    @Mock
    private DoctorRepository doctorRepository;

    @Mock
    private PatientService patientService;

    @Mock
    private DoctorService doctorService;

    @Mock
    private EmailService emailService;

    @InjectMocks
    private AppointmentService appointmentService;

    @Test
    void bookForPatient_shouldSaveAndNotifyPatientOfRequest() {
        Patient patient = Patient.builder()
                .id(12L)
                .user(User.builder().email("patient@example.com").fullName("Anita Sharma").build())
                .build();
        Doctor doctor = Doctor.builder()
                .id(7L)
                .user(User.builder().fullName("Dr. Sharma").build())
                .build();
        LocalDateTime appointmentDate = LocalDateTime.of(2027, 1, 15, 9, 0);
        AppointmentRequest request = new AppointmentRequest();
        request.setDoctorId(7L);
        request.setAppointmentDate(appointmentDate);

        when(doctorRepository.findById(7L)).thenReturn(Optional.of(doctor));
        when(appointmentRepository.save(any(Appointment.class))).thenAnswer(invocation -> {
            Appointment appointment = invocation.getArgument(0);
            appointment.setId(1L);
            return appointment;
        });

        Appointment result = appointmentService.bookForPatient(patient, request);

        assertThat(result.getStatus()).isEqualTo(Appointment.Status.PENDING);
        verify(emailService).sendAppointmentUpdateEmail(
                "patient@example.com", "Anita Sharma", "Dr. Sharma", appointmentDate, "requested");
    }

    @Test
    void rescheduleForPatient_shouldSaveAndNotify_whenPatientOwnsAppointment() {
        Patient patient = Patient.builder()
                .id(12L)
                .user(User.builder()
                        .email("patient@example.com")
                        .fullName("Anita Sharma")
                        .build())
                .build();
        Doctor doctor = Doctor.builder()
                .user(User.builder().fullName("Dr. Sharma").build())
                .build();
        Appointment appointment = Appointment.builder()
                .id(1L)
                .patient(patient)
                .doctor(doctor)
                .appointmentDate(LocalDateTime.of(2026, 9, 27, 9, 0))
                .build();
        LocalDateTime newAppointmentDate = LocalDateTime.of(2026, 9, 27, 10, 30);

        when(patientService.getPatientByEmail("patient@example.com")).thenReturn(patient);
        when(appointmentRepository.findById(1L)).thenReturn(Optional.of(appointment));
        when(appointmentRepository.save(appointment)).thenReturn(appointment);

        Appointment result = appointmentService.rescheduleForPatient(1L, newAppointmentDate, "patient@example.com");

        assertThat(result.getAppointmentDate()).isEqualTo(newAppointmentDate);
        verify(appointmentRepository).save(appointment);
        verify(emailService).sendAppointmentUpdateEmail(
                "patient@example.com", "Anita Sharma", "Dr. Sharma", newAppointmentDate, "rescheduled");
    }

    @Test
    void rescheduleForPatient_shouldNotSave_whenAppointmentBelongsToAnotherPatient() {
        Patient authenticatedPatient = Patient.builder().id(12L).build();
        Patient appointmentPatient = Patient.builder().id(13L).build();
        Appointment appointment = Appointment.builder()
                .id(1L)
                .patient(appointmentPatient)
                .appointmentDate(LocalDateTime.of(2026, 9, 27, 9, 0))
                .build();

        when(patientService.getPatientByEmail("patient@example.com")).thenReturn(authenticatedPatient);
        when(appointmentRepository.findById(1L)).thenReturn(Optional.of(appointment));

        assertThatThrownBy(() -> appointmentService.rescheduleForPatient(
                1L, LocalDateTime.of(2026, 9, 27, 10, 30), "patient@example.com"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Appointment not found");

        verify(appointmentRepository, never()).save(any());
        verifyNoInteractions(emailService);
    }

    @Test
    void getPatientsForDoctor_returnsUniquePatientsFromThatDoctorsAppointments() {
        Doctor doctor = Doctor.builder().id(4L).build();
        Patient patient = Patient.builder()
                .id(12L)
                .gender("F")
                .user(User.builder().fullName("Anita Sharma").build())
                .build();
        Appointment firstAppointment = Appointment.builder().id(21L).patient(patient).build();
        Appointment secondAppointment = Appointment.builder().id(22L).patient(patient).build();

        when(doctorService.getDoctorByEmail("doctor@example.com")).thenReturn(doctor);
        when(appointmentRepository.findByDoctorId(4L)).thenReturn(List.of(firstAppointment, secondAppointment));

        List<DoctorPatientResponse> result = appointmentService.getPatientsForDoctor("doctor@example.com");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getPatientId()).isEqualTo(12L);
        assertThat(result.get(0).getPatientCode()).isEqualTo("PT-00012");
        assertThat(result.get(0).getFullName()).isEqualTo("Anita Sharma");
        assertThat(result.get(0).getGender()).isEqualTo("F");
        assertThat(result.get(0).getAppointments())
                .extracting("appointmentId")
                .containsExactly(21L, 22L);
        verify(appointmentRepository).findByDoctorId(4L);
    }
}
