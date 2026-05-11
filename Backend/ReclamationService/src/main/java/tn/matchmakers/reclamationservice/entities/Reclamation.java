package tn.matchmakers.reclamationservice.entities;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Document(collection = "reclamations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Reclamation {
    @Id
    private String id;
    private String title;
    private String description;
    
    // Nouveaux champs pour la classification et logique métier
    private String type; // COMPORTEMENT, PAIEMENT, TECHNIQUE
    private String urgence; // HAUTE, MOYENNE, BASSE
    
    private String status; // PENDING, RESOLVED, REJECTED, AUTO_RESOLVED, ALERTE_ADMIN
    
    private String matchId; // ID du match concerné
    private String userId; // Auteur de la réclamation
    private String targetUserId; // Joueur signalé (facultatif)
    
    private String aiResponse; // Réponse automatique générée par l'IA

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
