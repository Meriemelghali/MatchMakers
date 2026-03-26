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
    private String eventTypeName;
    private Boolean isCompetition;
    private String competitionId;
    private String competitionName;

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

        if (event.getEventType() != null) {
            this.eventTypeName  = event.getEventType().getTypeName();
            this.isCompetition  = event.getEventType().getIsCompetition();
        }

        if (event.getCompetition() != null) {
            this.competitionId   = event.getCompetition().getId();
            this.competitionName = event.getCompetition().getNameCompetition();
        }
    }
}