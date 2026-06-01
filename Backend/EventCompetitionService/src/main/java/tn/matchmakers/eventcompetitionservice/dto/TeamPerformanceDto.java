package tn.matchmakers.eventcompetitionservice.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamPerformanceDto {
    private String fatigueLevel;
    private String energyStatus;
    private String moraleStatus;
    private String recommendation;
    private String performanceImpact;
    @JsonProperty("from_llm")
    private boolean from_llm;
}
