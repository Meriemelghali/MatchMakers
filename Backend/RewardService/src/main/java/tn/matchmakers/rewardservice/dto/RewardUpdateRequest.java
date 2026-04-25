package tn.matchmakers.rewardservice.dto;

import lombok.Data;
import tn.matchmakers.rewardservice.enums.RewardRarity;
import tn.matchmakers.rewardservice.enums.RewardStatus;
import tn.matchmakers.rewardservice.enums.RewardType;

import java.time.LocalDate;
import java.util.Map;

@Data
public class RewardUpdateRequest {

    private String name;
    private RewardType type;
    private String description;
    private LocalDate dateAwarded;

    private Integer points;
    private RewardRarity rarity;
    private RewardStatus status;
    private String imageUrl;
    private String awardedBy;
    private String revokedReason;
    private String userId;
    private String username;
    private String teamId;
    private String teamName;
    private String eventId;

    private Boolean evolutive;
    private Integer maxProgress;
    private Map<String, Object> evolutionRules;

    // Stores the visual design configuration (colors, ribbon, text, source image, transforms, etc.)
    private Map<String, Object> design;
}

