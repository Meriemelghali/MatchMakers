package tn.matchmakers.eventcompetitionservice.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;
import tn.matchmakers.eventcompetitionservice.entities.Event;
import tn.matchmakers.eventcompetitionservice.entities.enums.StatutEvent;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Data
public class EventResponseDto {
    private String id;
    private String name;
    private String description;
    private String location;
    private LocalDate startDate;
    private LocalDate endDate;

    @JsonFormat(shape = JsonFormat.Shape.STRING)
    private StatutEvent statutEvent;

    private Map<String, String> createdBy;
    private LocalDateTime createdAt;

    // ── nouveaux champs ──────────────────────────
    private String sportId;
    private String clubId;
    private String terrainId;
    private List<String> teamIds;
    private List<String> participantIds;
    private String eventTypeName;
    private Boolean isCompetition;
    private String competitionId;
    private String competitionName;

    // ── route fields ──────────────────────────
    private String startPoint;
    private String endPoint;
    private List<Double> distances;
    private List<Map<String, Double>> routePath;

    public EventResponseDto(Event event) {
        this.id          = event.getId();
        this.name        = event.getName();
        this.description = event.getDescriptionEvent();
        this.startDate   = event.getStartDate();
        this.endDate     = event.getEndDate();
        this.location    = event.getLocation();
        this.statutEvent = event.getStatutEvent();
        this.createdBy   = event.getOrganizerUserId();
        this.createdAt   = event.getCreatedAt();

        // ── nouveaux champs ──────────────────────
        this.sportId     = event.getSportId();
        this.clubId      = event.getClubId();
        this.terrainId   = event.getTerrainId();
        this.teamIds     = event.getTeamIds();
        this.participantIds = event.getParticipantIds();

        if (event.getEventType() != null) {
            this.eventTypeName  = event.getEventType().getTypeName();
            this.isCompetition  = event.getEventType().getIsCompetition();
        }

        if (event.getCompetition() != null) {
            this.competitionId   = event.getCompetition().getId();
            this.competitionName = event.getCompetition().getNameCompetition();
        }

        // ── route fields ──────────────────────
        this.startPoint = event.getStartPoint();
        this.endPoint = event.getEndPoint();
        this.distances = event.getDistances();
        this.routePath = event.getRoutePath();
    }
}