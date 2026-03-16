package tn.matchmakers.eventcompetitionservice.services.serviceInterfaces;

import tn.matchmakers.eventcompetitionservice.dto.EventCreateDto;
import tn.matchmakers.eventcompetitionservice.dto.EventResponseDto;
import tn.matchmakers.eventcompetitionservice.dto.external.MatchDto;
import tn.matchmakers.eventcompetitionservice.dto.external.SportDto;
import tn.matchmakers.eventcompetitionservice.entities.Event;
import tn.matchmakers.eventcompetitionservice.entities.enums.StatutEvent;

import java.time.LocalDate;
import java.util.List;

public interface EventService {
    // ─── CRUD
    EventResponseDto createEvent (EventCreateDto eventCreateDto, String token);
    List<Event> getAll();
    Event getById(String id);
    Event update(String id, EventCreateDto dto);
    void delete(String id);
    // ─── Métier
    Event changeStatut(String id, StatutEvent statut);
    Event assignCompetition(String eventId, String competitionId);
    List<Event> getByStatut(StatutEvent statut);
    List<Event> getByOrganizer(String userId);
    List<Event> getByDateRange(LocalDate from, LocalDate to);
    // ─── Appels externes
    SportDto getSportDetails(String sportId);
    List<MatchDto> getMatchesForCompetition(String competitionId);
}