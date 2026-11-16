package com.hms.service;

import com.hms.dto.MedicalRecordRequest;
import com.hms.entity.Doctor;
import com.hms.entity.MedicalRecord;
import com.hms.entity.Patient;
import com.hms.repository.AppointmentRepository;
import com.hms.repository.DoctorRepository;
import com.hms.repository.MedicalRecordRepository;
import com.hms.repository.PatientRepository;
import com.hms.repository.UserRepository;
import com.hms.entity.User;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MedicalRecordServiceTest {

    @Mock
    private MedicalRecordRepository medicalRecordRepository;

    @Mock
    private PatientRepository patientRepository;

    @Mock
    private DoctorRepository doctorRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private AppointmentRepository appointmentRepository;

    private MedicalRecordService medicalRecordService;

    @BeforeEach
    void setUp() {
        medicalRecordService = new MedicalRecordService(
                medicalRecordRepository,
                patientRepository,
                new DoctorService(doctorRepository, userRepository),
                appointmentRepository
        );
    }

    @Test
    void addRecord_shouldSaveVitalsForDoctorsPatient() {
        Patient patient = Patient.builder().id(9L).build();
        Doctor doctor = doctorWithUser(5L);
        MedicalRecordRequest request = new MedicalRecordRequest();
        request.setPatientId(9L);
        request.setDiagnosis("Follow-up");
        request.setBloodPressureSystolic(120);
        request.setBloodPressureDiastolic(80);
        request.setHeartRateBpm(72);
        request.setTemperatureCelsius(new BigDecimal("36.8"));
        request.setWeightKg(new BigDecimal("68.50"));
        request.setOxygenSaturationPercent(98);

        when(patientRepository.findById(9L)).thenReturn(Optional.of(patient));
        when(userRepository.findByEmail("doctor@example.com")).thenReturn(Optional.of(
                User.builder().id(1L).email("doctor@example.com").build()
        ));
        when(doctorRepository.findAll()).thenReturn(java.util.List.of(doctor));
        when(appointmentRepository.existsByPatientIdAndDoctorId(9L, 5L)).thenReturn(true);
        when(medicalRecordRepository.save(any(MedicalRecord.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        MedicalRecord result = medicalRecordService.addRecord("doctor@example.com", request);

        assertThat(result.getPatient()).isSameAs(patient);
        assertThat(result.getDoctor()).isSameAs(doctor);
        assertThat(result.getBloodPressureSystolic()).isEqualTo(120);
        assertThat(result.getBloodPressureDiastolic()).isEqualTo(80);
        assertThat(result.getHeartRateBpm()).isEqualTo(72);
        assertThat(result.getTemperatureCelsius()).isEqualByComparingTo("36.8");
        assertThat(result.getWeightKg()).isEqualByComparingTo("68.50");
        assertThat(result.getOxygenSaturationPercent()).isEqualTo(98);
        verify(medicalRecordRepository).save(any(MedicalRecord.class));
    }

    @Test
    void addRecord_shouldRejectPatientWithoutAppointmentWithDoctor() {
        when(patientRepository.findById(9L)).thenReturn(Optional.of(Patient.builder().id(9L).build()));
        when(userRepository.findByEmail("doctor@example.com")).thenReturn(Optional.of(
                User.builder().id(1L).email("doctor@example.com").build()
        ));
        when(doctorRepository.findAll()).thenReturn(java.util.List.of(doctorWithUser(5L)));
        when(appointmentRepository.existsByPatientIdAndDoctorId(9L, 5L)).thenReturn(false);

        MedicalRecordRequest request = new MedicalRecordRequest();
        request.setPatientId(9L);

        assertThatThrownBy(() -> medicalRecordService.addRecord("doctor@example.com", request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("A doctor can only add records for their own patients");
    }

    @Test
    void addRecord_shouldRequireBothBloodPressureValues() {
        when(patientRepository.findById(9L)).thenReturn(Optional.of(Patient.builder().id(9L).build()));
        when(userRepository.findByEmail("doctor@example.com")).thenReturn(Optional.of(
                User.builder().id(1L).email("doctor@example.com").build()
        ));
        when(doctorRepository.findAll()).thenReturn(java.util.List.of(doctorWithUser(5L)));
        when(appointmentRepository.existsByPatientIdAndDoctorId(9L, 5L)).thenReturn(true);

        MedicalRecordRequest request = new MedicalRecordRequest();
        request.setPatientId(9L);
        request.setBloodPressureSystolic(120);

        assertThatThrownBy(() -> medicalRecordService.addRecord("doctor@example.com", request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Both blood pressure values must be provided together");
    }

    private Doctor doctorWithUser(Long doctorId) {
        return Doctor.builder()
                .id(doctorId)
                .user(User.builder().id(1L).email("doctor@example.com").build())
                .build();
    }
}
