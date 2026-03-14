package tn.matchmakers.terrainservice.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import tn.matchmakers.terrainservice.entity.Terrain;
import tn.matchmakers.terrainservice.enums.SportType;
import tn.matchmakers.terrainservice.enums.TerrainStatus;

import java.util.List;

public interface TerrainRepository extends MongoRepository<Terrain, String> {
    List<Terrain> findByTypeSport(SportType typeSport);

    List<Terrain> findByStatut(TerrainStatus statut);

    List<Terrain> findByVilleIgnoreCase(String ville);

    List<Terrain> findByTypeSportAndStatut(SportType typeSport, TerrainStatus statut);
}
