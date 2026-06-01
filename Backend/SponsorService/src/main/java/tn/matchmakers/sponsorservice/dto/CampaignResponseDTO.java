package tn.matchmakers.sponsorservice.dto;

import lombok.*;
import tn.matchmakers.sponsorservice.entity.*;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CampaignResponseDTO {

    private String id;

    private String sponsorId;
    private String sponsorName;
    private String sponsorLogoUrl;

    // ✅ Champs UI (AJOUTÉS)
    private String campaignName;
    private String targetUrl;
    private String description;
    private Double budget;
    private String targetSport;

    private CampaignTarget target;
    private String targetId;
    private String targetName;

    private String badge;
    private CampaignPosition position;
    private String bannerUrl;

    private LocalDateTime startDate;
    private LocalDateTime endDate;

    private CampaignStatus status;

    private String adminNote;

    private long views;
    private long clicks;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}