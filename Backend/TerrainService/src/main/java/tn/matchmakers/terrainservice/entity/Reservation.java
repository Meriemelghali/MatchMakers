package tn.matchmakers.terrainservice.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import tn.matchmakers.terrainservice.enums.ReservationStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "reservations")
public class Reservation {

    @Id
    private String id;

    private String terrainId;
    private Long organisateurId;

    private LocalDateTime dateDebut;
    private LocalDateTime dateFin;

    @Builder.Default
    private ReservationStatus statut = ReservationStatus.EN_ATTENTE;

    private BigDecimal prixTotal;
    private String notes;
    private String matchId;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt;
}
