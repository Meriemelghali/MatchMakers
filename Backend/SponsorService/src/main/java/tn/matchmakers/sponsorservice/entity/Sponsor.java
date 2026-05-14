package tn.matchmakers.sponsorservice.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Document(collection = "sponsors")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Sponsor {

    @Id
    private String id;

    private String userId;
    private String userEmail;

    // Infos entreprise
    private String companyName;
    private String description;
    private String logoUrl;
    private String website;
    private String contactEmail;
    private String contactPhone;

    // Statut
    private SponsorStatus status;

    // Sport ciblé (optionnel)
    private String targetSport;

    // Admin
    private String adminNote;        // note de l'admin si rejeté
    private LocalDateTime approvedAt;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
