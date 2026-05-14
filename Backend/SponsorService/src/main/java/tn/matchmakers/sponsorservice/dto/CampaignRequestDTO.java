package tn.matchmakers.sponsorservice.dto;

import lombok.*;
import tn.matchmakers.sponsorservice.entity.*;
import java.time.LocalDateTime;

@Getter
@Setter
public class CampaignRequestDTO {

    private String sponsorId;

    // ✅ champs UI
    private String campaignName;
    private String targetUrl;
    private String description;
    private Double budget;
    private Double budgetSpent;
    private String targetSport;

    private CampaignTarget target;
    private String targetId;
    private String targetName;

    private String badge;
    private CampaignPosition position;
    private String bannerUrl;

    private LocalDateTime startDate;
    private LocalDateTime endDate;
}