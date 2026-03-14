package tn.matchmakers.terrainservice.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateReservationRequest {

    @NotNull(message = "L'ID du terrain est obligatoire")
    private String terrainId;

    @NotNull(message = "L'ID de l'organisateur est obligatoire")
    private Long organisateurId;

    @NotNull(message = "La date de début est obligatoire")
    private LocalDateTime dateDebut;

    @NotNull(message = "La date de fin est obligatoire")
    private LocalDateTime dateFin;

    private String notes;
    private String matchId;
}
