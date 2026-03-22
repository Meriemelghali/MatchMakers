package tn.matchmakers.terrainservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import tn.matchmakers.terrainservice.enums.SportType;
import tn.matchmakers.terrainservice.enums.SurfaceType;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateTerrainRequest {

    @NotBlank(message = "Le nom est obligatoire")
    private String nom;

    @NotBlank(message = "L'adresse est obligatoire")
    private String adresse;

    @NotBlank(message = "La ville est obligatoire")
    private String ville;

    private Double latitude;
    private Double longitude;

    @NotNull(message = "Le type de sport est obligatoire")
    private SportType typeSport;

    @NotNull(message = "Le type de surface est obligatoire")
    private SurfaceType typeSurface;

    private Integer capacite;
    private String description;
    private String contact;

    @Positive(message = "Le prix par heure doit être positif")
    private Double prixParHeure;

    private boolean eclairage;
    private boolean vestiaires;
    private boolean parking;
    private boolean tribunes;
    private boolean bar;
}
