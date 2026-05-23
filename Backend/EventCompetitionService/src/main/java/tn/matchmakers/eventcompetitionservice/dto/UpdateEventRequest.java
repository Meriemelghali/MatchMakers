package tn.matchmakers.eventcompetitionservice.dto;

import jakarta.validation.constraints.FutureOrPresent;
import lombok.Data;
import tn.matchmakers.eventcompetitionservice.entities.enums.CompetitionFormat;
import tn.matchmakers.eventcompetitionservice.entities.enums.StatutEvent;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;


@Data
public class UpdateEventRequest {
    // ── champs de base
    private String name;
    private String description;
    private String location;

    @FutureOrPresent(message = "La date de début ne peut pas être dans le passé")
    private LocalDate startDate;
    private LocalDate endDate;

    private String terrainId;
    private StatutEvent statutEvent;

    // (si requiresTeams)
    private List<String> teamIds;
    private List<String> participantIds;

    // (si isCompetition)
    private String competitionName;
    private Long maxTeam;
    private CompetitionFormat format;
    
    // ── route fields ──
    private String startPoint;
    private String endPoint;
    private List<Double> distances;
    private List<Map<String, Double>> routePath;
}
