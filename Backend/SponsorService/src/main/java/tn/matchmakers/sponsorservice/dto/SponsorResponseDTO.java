package tn.matchmakers.sponsorservice.dto;

import lombok.*;
import tn.matchmakers.sponsorservice.entity.SponsorStatus;
import java.time.LocalDateTime;

@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class SponsorResponseDTO {
    private String        id;
    private String        userId;
    private String        userEmail;
    private String        companyName;
    private String        description;
    private String        logoUrl;
    private String        website;
    private String        contactEmail;
    private String        contactPhone;
    private String        targetSport;
    private SponsorStatus status;
    private String        adminNote;
    private LocalDateTime approvedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private double budget;
private double budgetSpent;
}