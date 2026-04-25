package tn.matchmakers.rewardservice.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import tn.matchmakers.rewardservice.enums.RewardRarity;
import tn.matchmakers.rewardservice.enums.RewardStatus;
import tn.matchmakers.rewardservice.enums.RewardType;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "rewards")
public class Reward {

    @Id
    private String id;

    private String name;
    private RewardType type;
    private String description;
    private LocalDate dateAwarded;

    private Integer points;
    private RewardRarity rarity;

    @Builder.Default
    private RewardStatus status = RewardStatus.ACTIVE;
    private String imageUrl;
    private String awardedBy;
    private String revokedReason;

    private String userId;
    private String username;

    private String teamId;
    private String teamName;

    private String eventId;

    @Builder.Default
    private Integer level = 1;

    @Builder.Default
    private Integer progress = 0;

    @Builder.Default
    private Integer maxProgress = 100;

    @Builder.Default
    private Boolean evolutive = false;

    private Map<String, Object> evolutionRules;

    // Stores the visual design configuration (colors, ribbon, text, source image, transforms, etc.)
    private Map<String, Object> design;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}

