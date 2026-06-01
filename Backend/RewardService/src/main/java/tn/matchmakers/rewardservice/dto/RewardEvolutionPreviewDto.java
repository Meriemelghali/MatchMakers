package tn.matchmakers.rewardservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RewardEvolutionPreviewDto {
    private RewardDto before;
    private RewardDto after;
    private boolean leveledUp;
    private int levelsGained;
    private String message;
}

