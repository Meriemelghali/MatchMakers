package tn.matchmakers.matchservice.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import tn.matchmakers.matchservice.enums.MatchStatus;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateStatusRequest {

    @NotNull(message = "Le statut est obligatoire")
    private MatchStatus statut;
}
