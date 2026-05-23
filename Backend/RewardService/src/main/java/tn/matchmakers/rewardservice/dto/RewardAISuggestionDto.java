package tn.matchmakers.rewardservice.dto;

import lombok.Data;
import tn.matchmakers.rewardservice.enums.RewardRarity;
import tn.matchmakers.rewardservice.enums.RewardType;

@Data
public class RewardAISuggestionDto {
    private String name;
    private String description;
    private RewardType type;
    private RewardRarity rarity;
    private Integer points;
}

