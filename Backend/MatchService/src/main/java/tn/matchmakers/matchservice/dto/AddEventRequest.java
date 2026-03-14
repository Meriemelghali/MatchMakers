package tn.matchmakers.matchservice.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import tn.matchmakers.matchservice.enums.EventType;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AddEventRequest {

    @NotNull(message = "Le type d'événement est obligatoire")
    private EventType type;

    @NotNull(message = "La minute est obligatoire")
    private Integer minute;

    private String joueur;

    private String equipe; // "equipe1" or "equipe2"

    private String description;
}
