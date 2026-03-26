package tn.matchmakers.eventcompetitionservice.dto;

import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import tn.matchmakers.eventcompetitionservice.entities.enums.CompetitionFormat;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Data
public class CreateEventRequest {
    // ── champs de base ──────────────────────────────────────────
    @NotBlank(message = "Le nom de l'evenement est requis")
    private String name;

    @NotBlank(message = "La description de l'evenement est requis")
    private String description;

    @NotBlank(message = "La location de l'evenement est requis")
    private String location;

    @NotNull(message = "La date de début est requise")
    @FutureOrPresent(message = "La date de début ne peut pas être dans le passé")
    private LocalDate startDate;

    @NotNull(message = "La date de fin est requise")
    private LocalDate endDate;

    @NotBlank(message = "L'id du sport est requis")
    private String sportId;

    private String clubId;
    private String terrainId;

    @NotBlank(message = "L'id du type d'evenement est requis")
    private String eventTypeId;

    @NotBlank(message = "L'id du créateur est requis")
    private String createdBy;

    private Map<String, String> organizerUserId;

    // ── requis si isCompetition = true ──────────────────────────
    private String competitionName;
    private Long maxTeam;
    private CompetitionFormat format;

    // ── requis si requiresTeams = true ──────────────────────────
    private List<String> teamIds;
}
