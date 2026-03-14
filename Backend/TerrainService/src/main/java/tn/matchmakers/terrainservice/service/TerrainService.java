package tn.matchmakers.terrainservice.service;

import tn.matchmakers.terrainservice.dto.*;
import tn.matchmakers.terrainservice.enums.SportType;
import tn.matchmakers.terrainservice.enums.TerrainStatus;

import java.time.LocalDateTime;
import java.util.List;

public interface TerrainService {
    TerrainDTO creerTerrain(CreateTerrainRequest request);

    TerrainDTO obtenirTerrain(String id);

    List<TerrainDTO> obtenirTousLesTerrains();

    TerrainDTO mettreAJourTerrain(String id, CreateTerrainRequest request);

    void supprimerTerrain(String id);

    TerrainDTO changerStatut(String id, TerrainStatus statut);

    TerrainDTO ajouterPhoto(String id, String photoFilename);

    TerrainDTO supprimerPhoto(String id, String photoFilename);

    List<TerrainDTO> filtrerParTypeSport(SportType typeSport);

    List<TerrainDTO> filtrerParStatut(TerrainStatus statut);

    List<TerrainDTO> filtrerParVille(String ville);

    List<TerrainDTO> trouverDisponiblesParTypeEtCreneau(SportType typeSport, LocalDateTime debut, LocalDateTime fin);

    TerrainDTO gererCreneaux(String id, List<TimeSlotDTO> creneaux);
}
