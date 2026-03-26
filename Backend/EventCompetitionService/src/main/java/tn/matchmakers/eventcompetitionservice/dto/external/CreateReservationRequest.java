package tn.matchmakers.eventcompetitionservice.dto.external;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class CreateReservationRequest {
    private String terrainId;
    private Long organisateurId;
    private LocalDateTime dateDebut;
    private LocalDateTime dateFin;
    private String notes;
    private String matchId;
}
