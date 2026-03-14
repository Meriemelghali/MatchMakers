package tn.matchmakers.terrainservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import tn.matchmakers.terrainservice.enums.ReservationStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReservationDTO {
    private String id;
    private String terrainId;
    private Long organisateurId;
    private LocalDateTime dateDebut;
    private LocalDateTime dateFin;
    private ReservationStatus statut;
    private BigDecimal prixTotal;
    private String notes;
    private String matchId;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
