package tn.matchmakers.eventcompetitionservice.dto.external;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ReservationDTO {
    private String id;
    private String terrainId;
    private String eventId;
    private LocalDateTime debut;
    private LocalDateTime fin;
    private String statut;
}
