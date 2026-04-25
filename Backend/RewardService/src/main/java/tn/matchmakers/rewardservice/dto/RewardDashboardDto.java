package tn.matchmakers.rewardservice.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class RewardDashboardDto {
    private long total;
    private List<RewardDashboardItemDto> byType;
    private List<RewardDashboardItemDto> byTeam;
    private Double avgPoints;
    private Integer maxPoints;
    private LocalDateTime generatedAt;
}

