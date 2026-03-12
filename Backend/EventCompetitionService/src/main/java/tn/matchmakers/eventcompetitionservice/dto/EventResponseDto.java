package tn.matchmakers.eventcompetitionservice.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;
import tn.matchmakers.eventcompetitionservice.entities.Event;
import tn.matchmakers.eventcompetitionservice.entities.enums.StatutEvent;

import java.time.LocalDate;
import java.time.LocalDateTime;
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
    public EventResponseDto(Event event) {
        this.id = event.getId();
        this.name = event.getName();
        this.description = event.getDescription();
        this.location = event.getLocation();
        this.startDate = event.getStartDate();
        this.endDate = event.getEndDate();
        this.statutEvent = event.getStatutEvent();
        this.createdBy = event.getCreatedBy();
        this.createdAt = event.getCreatedAt();
    }
}