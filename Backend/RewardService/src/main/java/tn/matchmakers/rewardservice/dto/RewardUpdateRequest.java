package tn.matchmakers.rewardservice.dto;

import lombok.Data;
import tn.matchmakers.rewardservice.enums.RewardRarity;
import tn.matchmakers.rewardservice.enums.RewardStatus;
import tn.matchmakers.rewardservice.enums.RewardType;

import java.time.LocalDate;

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
}

