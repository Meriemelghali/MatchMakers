package tn.matchmakers.matchservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import tn.matchmakers.matchservice.enums.MatchStatus;
import tn.matchmakers.matchservice.enums.MatchType;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MatchDTO {
    private String id;
    private String titre;
    private String equipe1;
    private String equipe2;
    private int scoreEquipe1;
    private int scoreEquipe2;
    private LocalDateTime dateDebut;
    private LocalDateTime dateFin;
    private MatchStatus statut;
    private MatchType type;
    private String arbitre;
    private String description;
    private Integer capaciteSpectateurs;
    private String terrainId;
    private List<MatchEventDTO> evenements;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
