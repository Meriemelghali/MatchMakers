package tn.matchmakers.reclamationservice.repositories;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import tn.matchmakers.reclamationservice.entities.Sanction;
import java.util.List;

@Repository
public interface SanctionRepository extends MongoRepository<Sanction, String> {
    List<Sanction> findByUserId(String userId);
}
