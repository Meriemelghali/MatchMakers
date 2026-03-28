package tn.matchmakers.reservationservice.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import tn.matchmakers.reservationservice.entities.Terrain;

@Repository
public interface TerrainRepository extends MongoRepository<Terrain, String> {
}
