package com.hms.service;

import com.hms.dto.CreatePrescriptionRequest;
import com.hms.dto.PrescriptionResponse;
import com.hms.entity.*;
import com.hms.repository.AppointmentRepository;
import com.hms.repository.PatientRepository;
import com.hms.repository.PrescriptionRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PrescriptionServiceTest {

    @Mock
    private PrescriptionRepository prescriptionRepository;

    @Mock
    private PatientRepository patientRepository;

    @Mock
    private AppointmentRepository appointmentRepository;

    @Mock
    private DoctorService doctorService;

    @Mock
    private PatientService patientService;

    @InjectMocks
    private PrescriptionService prescriptionService;

    @Test
    void create_savesPrescriptionForAppointmentOwnedByDoctorAndPatient() {
        Doctor doctor = Doctor.builder()
                .id(5L)
                .approvalStatus(DoctorApprovalStatus.APPROVED)
                .specialization("Cardiology")
                .medicalRegistrationNumber("REG-123")
                .phone("0401234567")
                .user(User.builder().fullName("Dr. Lee").build())
                .build();
        Patient patient = Patient.builder()
                .id(7L)
                .user(User.builder().fullName("Ava Patient").build())
                .build();
        Appointment appointment = Appointment.builder()
                .id(4L)
                .doctor(doctor)
                .patient(patient)
                .status(Appointment.Status.CONFIRMED)
                .build();
        CreatePrescriptionRequest request = createRequest(7L, 4L);

        when(doctorService.getDoctorByEmail("doctor@example.com")).thenReturn(doctor);
        when(patientRepository.findById(7L)).thenReturn(Optional.of(patient));
        when(appointmentRepository.findById(4L)).thenReturn(Optional.of(appointment));
        when(prescriptionRepository.save(any(Prescription.class))).thenAnswer(invocation -> {
            Prescription saved = invocation.getArgument(0);
            saved.setId(11L);
            return saved;
        });

        PrescriptionResponse response = prescriptionService.create("doctor@example.com", Role.DOCTOR, request);

        assertThat(response.id()).isEqualTo(11L);
        assertThat(response.patientId()).isEqualTo(7L);
        assertThat(response.patientName()).isEqualTo("Ava Patient");
        assertThat(response.doctorName()).isEqualTo("Dr. Lee");
        assertThat(response.doctorSpecialization()).isEqualTo("Cardiology");
        assertThat(response.doctorRegistrationNumber()).isEqualTo("REG-123");
        assertThat(response.doctorPhone()).isEqualTo("0401234567");
        assertThat(response.appointmentId()).isEqualTo(4L);
        assertThat(response.medicines()).containsExactly(new PrescriptionResponse.Medicine(
                "Medicine A", "10 mg", "Once daily", "5 days", "After food"));
        assertThat(response.notes()).isEqualTo("Take as prescribed");
    }

    @Test
    void create_rejectsAppointmentAssignedToAnotherDoctor() {
        Doctor loggedInDoctor = Doctor.builder().id(5L).approvalStatus(DoctorApprovalStatus.APPROVED).build();
        Doctor assignedDoctor = Doctor.builder().id(6L).approvalStatus(DoctorApprovalStatus.APPROVED).build();
        Patient patient = Patient.builder().id(7L).build();
        Appointment appointment = Appointment.builder()
                .id(4L)
                .doctor(assignedDoctor)
                .patient(patient)
                .status(Appointment.Status.CONFIRMED)
                .build();
        CreatePrescriptionRequest request = createRequest(7L, 4L);

        when(doctorService.getDoctorByEmail("doctor@example.com")).thenReturn(loggedInDoctor);
        when(patientRepository.findById(7L)).thenReturn(Optional.of(patient));
        when(appointmentRepository.findById(4L)).thenReturn(Optional.of(appointment));

        assertThatThrownBy(() -> prescriptionService.create("doctor@example.com", Role.DOCTOR, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Appointment must belong to the selected patient and doctor");

        verify(prescriptionRepository, never()).save(any());
    }

    @Test
    void create_rejectsUnconfirmedAppointment() {
        Doctor doctor = Doctor.builder().id(5L).approvalStatus(DoctorApprovalStatus.APPROVED).build();
        Patient patient = Patient.builder().id(7L).build();
        Appointment appointment = Appointment.builder()
                .id(4L)
                .doctor(doctor)
                .patient(patient)
                .status(Appointment.Status.PENDING)
                .build();
        CreatePrescriptionRequest request = createRequest(7L, 4L);

        when(doctorService.getDoctorByEmail("doctor@example.com")).thenReturn(doctor);
        when(patientRepository.findById(7L)).thenReturn(Optional.of(patient));
        when(appointmentRepository.findById(4L)).thenReturn(Optional.of(appointment));

        assertThatThrownBy(() -> prescriptionService.create("doctor@example.com", Role.DOCTOR, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("The appointment must be confirmed before writing a prescription");

        verify(prescriptionRepository, never()).save(any());
    }

    @Test
    void create_rejectsRequestWithoutAppointment() {
        Doctor doctor = Doctor.builder().id(5L).approvalStatus(DoctorApprovalStatus.APPROVED).build();
        when(doctorService.getDoctorByEmail("doctor@example.com")).thenReturn(doctor);
        CreatePrescriptionRequest request = createRequest(7L, null);

        assertThatThrownBy(() -> prescriptionService.create("doctor@example.com", Role.DOCTOR, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("A confirmed appointment is required to write a prescription");

        verifyNoInteractions(patientRepository, prescriptionRepository);
        verify(appointmentRepository, never()).findById(any());
    }

    @Test
    void create_rejectsUnapprovedDoctor() {
        Doctor doctor = Doctor.builder().id(5L).approvalStatus(DoctorApprovalStatus.PENDING_REVIEW).build();
        CreatePrescriptionRequest request = createRequest(7L, 4L);
        when(doctorService.getDoctorByEmail("doctor@example.com")).thenReturn(doctor);

        assertThatThrownBy(() -> prescriptionService.create("doctor@example.com", Role.DOCTOR, request))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessage("Your doctor profile must be approved before writing prescriptions");

        verifyNoInteractions(patientRepository, appointmentRepository, prescriptionRepository);
    }

    @Test
    void getForPatient_rejectsNonPatientRole() {
        assertThatThrownBy(() -> prescriptionService.getForPatient("doctor@example.com", Role.DOCTOR))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessage("This action is not available to your account");

        verifyNoInteractions(patientService, prescriptionRepository);
    }

    private CreatePrescriptionRequest createRequest(Long patientId, Long appointmentId) {
        CreatePrescriptionRequest request = new CreatePrescriptionRequest();
        request.setPatientId(patientId);
        request.setAppointmentId(appointmentId);
        request.setNotes(" Take as prescribed ");
        CreatePrescriptionRequest.MedicineRequest medicine = new CreatePrescriptionRequest.MedicineRequest();
        medicine.setName(" Medicine A ");
        medicine.setDosage(" 10 mg ");
        medicine.setFrequency(" Once daily ");
        medicine.setDuration(" 5 days ");
        medicine.setInstructions(" After food ");
        request.setMedicines(List.of(medicine));
        return request;
    }
}
