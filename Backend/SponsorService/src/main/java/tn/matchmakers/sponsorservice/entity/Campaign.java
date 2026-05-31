package tn.matchmakers.sponsorservice.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Document(collection = "campaigns")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Campaign {

    @Id
    private String id;

    private String sponsorId;
    private String sponsorName;
    private String sponsorLogoUrl;

    // Champs UI
    private String campaignName;
    private String targetUrl;
    private String description;
    private Double budget;
    private Double budgetSpent;
    private String targetSport;

    // Cible
    private CampaignTarget   target;    // PRODUCT / EVENT / GLOBAL
    private String           targetId;  // ID du produit ou événement
    private String           targetName;

    // Affichage
    private String           badge;     // "Sponsorisé", "Partenaire officiel"...
    private CampaignPosition position;  // TOP / FEATURED / BANNER
    private String           bannerUrl; // image bannière

    // Période
    private LocalDateTime startDate;
    private LocalDateTime endDate;

    // Statut
    private CampaignStatus status;
    private String         adminNote;

    // Stats
    @Builder.Default private long views  = 0;
    @Builder.Default private long clicks = 0;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}