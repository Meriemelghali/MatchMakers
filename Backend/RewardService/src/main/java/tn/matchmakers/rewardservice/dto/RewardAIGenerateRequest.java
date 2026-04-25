package tn.matchmakers.rewardservice.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RewardAIGenerateRequest {
    @NotBlank
    private String eventType;

    @Min(1)
    @Max(128)
    private Integer teamCount = 2;

    @NotBlank
    private String difficulty; // EASY | MEDIUM | HARD (free text accepted)
}

