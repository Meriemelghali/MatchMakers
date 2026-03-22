package tn.matchmakers.terrainservice.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import tn.matchmakers.terrainservice.enums.SportType;
import tn.matchmakers.terrainservice.enums.SurfaceType;
import tn.matchmakers.terrainservice.enums.TerrainStatus;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "terrains")
public class Terrain {

    @Id
    private String id;

    private String nom;
    private String adresse;
    private String ville;
    private Double latitude;
    private Double longitude;

    private SportType typeSport;
    private SurfaceType typeSurface;

    @Builder.Default
    private TerrainStatus statut = TerrainStatus.DISPONIBLE;

    private Integer capacite;
    private String description;
    private String contact;
    private Double prixParHeure;

    @Builder.Default
    private List<String> photos = new ArrayList<>();

    // Amenities
    @Builder.Default
    private boolean eclairage = false;
    @Builder.Default
    private boolean vestiaires = false;
    @Builder.Default
    private boolean parking = false;
    @Builder.Default
    private boolean tribunes = false;
    @Builder.Default
    private boolean bar = false;

    @Builder.Default
    private List<TimeSlot> creneaux = new ArrayList<>();

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt;
}
