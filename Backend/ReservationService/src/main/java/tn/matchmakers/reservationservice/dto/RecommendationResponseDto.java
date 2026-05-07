package tn.matchmakers.reservationservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecommendationResponseDto {
    private List<TerrainRecommendationItem> recommandations;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TerrainRecommendationItem {
        private String terrain_id;
        private double score;
        private List<String> raisons;
        private Map<String, Double> details;
    }
}
