package tn.matchmakers.matchservice.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import tn.matchmakers.matchservice.enums.MatchStatus;
import tn.matchmakers.matchservice.enums.MatchType;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "matches")
public class Match {

    @Id
    private String id;

    private String titre;
    private String equipe1;
    private String equipe2;

    @Builder.Default
    private int scoreEquipe1 = 0;
    @Builder.Default
    private int scoreEquipe2 = 0;

    private LocalDateTime dateDebut;
    private LocalDateTime dateFin;

    @Builder.Default
    private MatchStatus statut = MatchStatus.PLANIFIE;

    private MatchType type;
    private String arbitre;
    private String description;
    private Integer capaciteSpectateurs;

    @Indexed
    private String terrainId;

    @Builder.Default
    private List<MatchEvent> evenements = new ArrayList<>();

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt;
}
