package tn.matchmakers.eventcompetitionservice.dto.external;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class CreateMatchRequest {
    private String titre;
    private String equipe1;
    private String equipe2;
    private LocalDateTime dateDebut;
    private LocalDateTime dateFin;
    private String type;
    private String terrainId;
    private String description;
    private Integer capaciteSpectateurs;
}
