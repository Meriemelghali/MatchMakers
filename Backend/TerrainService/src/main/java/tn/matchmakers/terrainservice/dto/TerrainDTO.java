package tn.matchmakers.terrainservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import tn.matchmakers.terrainservice.enums.SportType;
import tn.matchmakers.terrainservice.enums.SurfaceType;
import tn.matchmakers.terrainservice.enums.TerrainStatus;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TerrainDTO {
    private String id;
    private String nom;
    private String adresse;
    private String ville;
    private Double latitude;
    private Double longitude;
    private SportType typeSport;
    private SurfaceType typeSurface;
    private TerrainStatus statut;
    private Integer capacite;
    private String description;
    private String contact;
    private Double prixParHeure;
    private List<String> photos;
    private boolean eclairage;
    private boolean vestiaires;
    private boolean parking;
    private boolean tribunes;
    private boolean bar;
    private List<TimeSlotDTO> creneaux;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
