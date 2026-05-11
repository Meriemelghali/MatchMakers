package tn.matchmakers.eventcompetitionservice.services.serviceInterfaces;

import tn.matchmakers.eventcompetitionservice.dto.CreateEventRequest;
import tn.matchmakers.eventcompetitionservice.dto.EventResponseDto;
import tn.matchmakers.eventcompetitionservice.dto.UpdateEventRequest;
import tn.matchmakers.eventcompetitionservice.dto.external.MatchDto;
import tn.matchmakers.eventcompetitionservice.dto.external.SportDto;
import tn.matchmakers.eventcompetitionservice.entities.Event;
import tn.matchmakers.eventcompetitionservice.entities.enums.StatutEvent;

import java.time.LocalDate;
import java.util.List;

public interface EventService {
    // ─── CRUD
    EventResponseDto createEvent(CreateEventRequest dto, String token);
    List<Event> getAll();
    Event getById(String id);
    EventResponseDto update(String id, UpdateEventRequest dto, String token);
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
    EventResponseDto joinTeam(String eventId, String teamId, String token);
    EventResponseDto leaveTeam(String eventId, String teamId, String token);
    EventResponseDto joinEvent(String eventId, String token);
    EventResponseDto leaveEvent(String eventId, String token);

    // ─── Localisation
    List<Event> getByLocation(String city);
    List<Event> getByLocationAndStatut(String city, StatutEvent statut);

}