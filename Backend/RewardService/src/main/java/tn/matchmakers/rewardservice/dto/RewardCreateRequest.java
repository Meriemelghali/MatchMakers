package tn.matchmakers.rewardservice.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import tn.matchmakers.rewardservice.enums.RewardRarity;
import tn.matchmakers.rewardservice.enums.RewardType;

import java.time.LocalDate;

@Data
public class RewardCreateRequest {

    @NotBlank
    private String name;

    @NotNull
    private RewardType type;

    private String description;

    @NotNull
    private LocalDate dateAwarded;

    @Min(0)
    private Integer points;

    private RewardRarity rarity;
    private String imageUrl;
    private String awardedBy;

    private String playerId;
    private String playerName;
    private String teamId;
    private String teamName;
    private String eventId;
}

