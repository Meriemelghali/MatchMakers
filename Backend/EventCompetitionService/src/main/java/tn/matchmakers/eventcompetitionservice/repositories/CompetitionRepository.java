package tn.matchmakers.eventcompetitionservice.repositories;

import org.springframework.data.mongodb.repository.MongoRepository;
import tn.matchmakers.eventcompetitionservice.entities.Competition;

public interface CompetitionRepository extends MongoRepository<Competition, String> {
}
