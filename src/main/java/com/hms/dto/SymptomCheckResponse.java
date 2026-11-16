package com.hms.dto;

import lombok.*;
import java.util.List;

@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
public class SymptomCheckResponse {
    private List<Prediction> predictions;
    private String recommendedSpecialization;
    private String urgency;
    private String disclaimer;

    @Getter @Setter
    @NoArgsConstructor @AllArgsConstructor
    public static class Prediction {
        private String disease;
        private double confidence; // 0-100
    }
}
