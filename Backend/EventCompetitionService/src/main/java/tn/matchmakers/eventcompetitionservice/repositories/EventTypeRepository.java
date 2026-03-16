package tn.matchmakers.eventcompetitionservice.repositories;

import org.springframework.data.mongodb.repository.MongoRepository;
import tn.matchmakers.eventcompetitionservice.entities.EventType;

import java.util.List;
import java.util.Optional;

public interface EventTypeRepository extends MongoRepository<EventType, String> {
    Optional<EventType> findByTypeName(String typeName);
    List<EventType> findByIsCompetition(Boolean isCompetition);
}
