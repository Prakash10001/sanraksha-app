package com.hms.service;

import com.hms.dto.SymptomCheckRequest;
import com.hms.dto.SymptomCheckResponse;
import com.hms.entity.Patient;
import com.hms.entity.SymptomCheck;
import com.hms.repository.SymptomCheckRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class SymptomCheckService {

    private final RestTemplate restTemplate;
    private final SymptomCheckRepository symptomCheckRepository;
    private final PatientService patientService;

    @Value("${ai-service.base-url}")
    private String aiServiceBaseUrl;

    public SymptomCheckResponse analyze(String patientEmail, SymptomCheckRequest request) {
        Patient patient = patientService.getPatientByEmail(patientEmail);

        // Call the Python FastAPI AI microservice
        Map<String, String> payload = Map.of("symptoms", request.getSymptoms());
        SymptomCheckResponse aiResponse;
        try {
            aiResponse = restTemplate.postForObject(
                    aiServiceBaseUrl + "/predict",
                    payload,
                    SymptomCheckResponse.class
            );
        } catch (Exception e) {
            throw new IllegalStateException("AI symptom service is unavailable. Please try again shortly.", e);
        }

        if (aiResponse == null || aiResponse.getPredictions() == null || aiResponse.getPredictions().isEmpty()) {
            throw new IllegalStateException("Could not generate a suggestion for the given symptoms");
        }

        // Persist the top prediction against the patient's history
        var top = aiResponse.getPredictions().get(0);
        SymptomCheck record = SymptomCheck.builder()
                .patient(patient)
                .symptomsInput(request.getSymptoms())
                .predictedDisease(top.getDisease())
                .confidence(top.getConfidence())
                .recommendedSpecialization(aiResponse.getRecommendedSpecialization())
                .urgency(aiResponse.getUrgency())
                .build();
        symptomCheckRepository.save(record);

        return aiResponse;
    }

    public List<SymptomCheck> getHistory(Long patientId) {
        return symptomCheckRepository.findByPatientIdOrderByCreatedAtDesc(patientId);
    }
}
