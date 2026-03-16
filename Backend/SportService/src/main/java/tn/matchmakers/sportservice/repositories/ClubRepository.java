package tn.matchmakers.sportservice.repositories;

import org.springframework.data.mongodb.repository.MongoRepository;
import tn.matchmakers.sportservice.entities.Club;

import java.util.List;

public interface ClubRepository extends MongoRepository<Club, String> {
    List<Club> findBySportId(String sportId);
    List<Club> findByCity(String city);
    List<Club> findByOwnerId(String ownerId);
}
