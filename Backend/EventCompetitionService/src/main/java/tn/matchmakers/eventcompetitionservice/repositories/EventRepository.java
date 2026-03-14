package tn.matchmakers.eventcompetitionservice.repositories;

import org.springframework.data.mongodb.repository.MongoRepository;
import tn.matchmakers.eventcompetitionservice.entities.Event;

import java.time.LocalDate;
import java.util.Optional;

public interface EventRepository extends MongoRepository<Event, String> {
    Optional<Event> findByName(String name);
    Optional<Event> findByStartDate(LocalDate startDate);
    Optional<Event> findByEndDate(LocalDate endDate);

    boolean existsByName(String name);
}
