package tn.matchmakers.eventcompetitionservice.repositories;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import tn.matchmakers.eventcompetitionservice.entities.Event;
import tn.matchmakers.eventcompetitionservice.entities.enums.StatutEvent;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface EventRepository extends MongoRepository<Event, String> {
    Optional<Event> findByName(String name);
    Optional<Event> findByStartDate(LocalDate startDate);
    Optional<Event> findByEndDate(LocalDate endDate);

    boolean existsByName(String name);
    List<Event> findByStatutEvent(StatutEvent statut);
    List<Event> findByStartDateBetween(LocalDate from, LocalDate to);
    @Query("{ 'organizerUserId.id': ?0 }")
    List<Event> findByOrganizerId(String userId);

    List<Event> findByEventTypeId(String eventTypeId);
    List<Event> findByLocationContainingIgnoreCase(String city);
    List<Event> findByLocationContainingIgnoreCaseAndStatutEvent(
            String city, StatutEvent statut);
}
