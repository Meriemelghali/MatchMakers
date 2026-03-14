package tn.matchmakers.matchservice.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateScoreRequest {

    @NotNull(message = "Le score de l'équipe 1 est obligatoire")
    @Min(value = 0, message = "Le score ne peut pas être négatif")
    private Integer scoreEquipe1;

    @NotNull(message = "Le score de l'équipe 2 est obligatoire")
    @Min(value = 0, message = "Le score ne peut pas être négatif")
    private Integer scoreEquipe2;
}
