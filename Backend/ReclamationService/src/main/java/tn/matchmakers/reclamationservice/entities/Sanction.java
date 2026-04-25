package tn.matchmakers.reclamationservice.entities;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Document(collection = "sanctions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Sanction {
    @Id
    private String id;
    
    private String userId; // Le joueur sanctionné
    private String reclamationId; // La réclamation ayant causé la sanction
    
    private String typeSanction; // WARNING, BAN_1_JOUR, BAN_DEFINITIF
    private String motif; // Raison de la sanction
    
    private LocalDateTime createdAt;
}
