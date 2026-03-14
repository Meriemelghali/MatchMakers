package tn.matchmakers.matchservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import tn.matchmakers.matchservice.enums.MatchType;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateMatchRequest {

    @NotBlank(message = "Le titre est obligatoire")
    private String titre;

    @NotBlank(message = "L'équipe 1 est obligatoire")
    private String equipe1;

    @NotBlank(message = "L'équipe 2 est obligatoire")
    private String equipe2;

    @NotNull(message = "La date de début est obligatoire")
    private LocalDateTime dateDebut;

    @NotNull(message = "La date de fin est obligatoire")
    private LocalDateTime dateFin;

    @NotNull(message = "Le type de match est obligatoire")
    private MatchType type;

    private String arbitre;
    private String description;
    private Integer capaciteSpectateurs;
    private String terrainId;
}
