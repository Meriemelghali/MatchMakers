package tn.matchmakers.eventcompetitionservice.services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.reactive.function.client.WebClient;
import tn.matchmakers.eventcompetitionservice.dto.EventCreateDto;
import tn.matchmakers.eventcompetitionservice.dto.EventResponseDto;
import tn.matchmakers.eventcompetitionservice.dto.external.MatchDto;
import tn.matchmakers.eventcompetitionservice.dto.external.SportDto;
import tn.matchmakers.eventcompetitionservice.entities.Competition;
import tn.matchmakers.eventcompetitionservice.entities.Event;
import tn.matchmakers.eventcompetitionservice.entities.EventType;
import tn.matchmakers.eventcompetitionservice.entities.enums.StatutEvent;
import tn.matchmakers.eventcompetitionservice.exceptions.DuplicateEntityException;
import tn.matchmakers.eventcompetitionservice.exceptions.ForbiddenException;
import tn.matchmakers.eventcompetitionservice.exceptions.UnauthorizedException;
import tn.matchmakers.eventcompetitionservice.repositories.CompetitionRepository;
import tn.matchmakers.eventcompetitionservice.repositories.EventRepository;
import tn.matchmakers.eventcompetitionservice.repositories.EventTypeRepository;
import tn.matchmakers.eventcompetitionservice.services.serviceInterfaces.EventService;

import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class EventServiceImpl implements EventService {
    private final EventRepository eventRepository;
    private final EventTypeRepository eventTypeRepository;
    private final CompetitionRepository competitionRepository;
    private final RestTemplate restTemplate;

    @Qualifier("sportWebClient")
    private final WebClient sportWebClient;

    @Qualifier("matchWebClient")
    private final WebClient matchWebClient;

    private final String userServiceUrl = "http://localhost:8081/users/auth/validate-token";

    // ─── CRUD
    @Override
    public EventResponseDto createEvent(EventCreateDto dto, String token) {

        // ─── 1. Valider le token et récupérer l'utilisateur ───────────────────
        Map<String, Object> userInfo = getUserInfoFromToken(token);

        // ─── 2. Vérifier le rôle (ADMIN ou ORGANIZER) ─────────────────────────
        checkOrganizerOrAdminRole(userInfo);

        // ─── 3. Construire createdBy ───────────────────────────────────────────
        String userId    = String.valueOf(userInfo.get("id"));
        String firstName = String.valueOf(userInfo.get("firstName"));
        String lastName  = String.valueOf(userInfo.get("lastName"));

        Map<String, String> createdByMap = Map.of(
                "id",   userId,
                "name", (firstName + " " + lastName).trim()
        );

        // ─── 4. Vérifier unicité du nom ────────────────────────────────────────
        if (eventRepository.existsByName(dto.getName())) {
            throw new DuplicateEntityException("Un événement avec ce nom existe déjà");
        }

        // ─── 5. Récupérer l'EventType ──────────────────────────────────────────
        EventType eventType = eventTypeRepository.findById(dto.getEventTypeId())
                .orElseThrow(() -> new RuntimeException("EventType non trouvé: " + dto.getEventTypeId()));

        // ─── 6. Créer l'événement ──────────────────────────────────────────────
        Event event = new Event();
        event.setName(dto.getName());
        event.setDescriptionEvent(dto.getDescription());
        event.setStartDate(dto.getStartDate());
        event.setEndDate(dto.getEndDate());
        event.setStatutEvent(StatutEvent.PLANNED);
        event.setLocation(dto.getLocation());
        event.setOrganizerUserId(createdByMap);
        event.setEventType(eventType);

        // ─── 7. Si compétition → créer Competition automatiquement ───────────
        if (Boolean.TRUE.equals(eventType.getIsCompetition())) {
            Competition competition = Competition.builder()
                    .nameCompetition("Compétition — " + dto.getName())
                    .maxTeam(dto.getMaxTeam() != null ? dto.getMaxTeam() : 0L)
                    .build();
            Competition savedCompetition = competitionRepository.save(competition);
            event.setCompetition(savedCompetition);
        }

        Event savedEvent = eventRepository.save(event);
        return new EventResponseDto(savedEvent);
    }
    public List<Event> getAll() {
        return eventRepository.findAll();
    }
    public Event getById(String id) {
        return eventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Événement non trouvé: " + id));
    }
    @Override
    public Event update(String id, EventCreateDto dto) {
        Event existing = getById(id);
        existing.setName(dto.getName());
        existing.setDescriptionEvent(dto.getDescription());
        existing.setStartDate(dto.getStartDate());
        existing.setEndDate(dto.getEndDate());
        return eventRepository.save(existing);
    }
    public void delete(String id) {
        eventRepository.deleteById(id);
    }



    // ─── Métier
    public Event changeStatut(String id, StatutEvent statut) {
        Event evenement = getById(id);
        evenement.setStatutEvent(statut);
        return eventRepository.save(evenement);
    }
    public Event assignCompetition(String evenementId, String competitionId) {
        Event evenement = getById(evenementId);
        Competition competition = competitionRepository.findById(competitionId)
                .orElseThrow(() -> new RuntimeException("Competition non trouvée: " + competitionId));
        evenement.setCompetition(competition);
        return eventRepository.save(evenement);
    }
    public List<Event> getByStatut(StatutEvent statut) {
        return eventRepository.findByStatutEvent(statut);
    }
    public List<Event> getByOrganizer(String userId) {
        return eventRepository.findByOrganizerId(userId);
    }

    public List<Event> getByDateRange(LocalDate from, LocalDate to) {
        return eventRepository.findByStartDateBetween(from, to);
    }

    // ─── Appels externes
    public SportDto getSportDetails(String sportId) {
        try {
            return sportWebClient.get()
                    .uri("/api/sports/{id}", sportId)
                    .retrieve()
                    .bodyToMono(SportDto.class)
                    .block();
        } catch (Exception e) {
            log.error("Erreur appel SportService pour sport {}: {}", sportId, e.getMessage());
            return null;
        }
    }
    public List<MatchDto> getMatchesForCompetition(String competitionId) {
        try {
            return matchWebClient.get()
                    .uri("/api/matches/competition/{id}", competitionId)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<List<MatchDto>>() {})
                    .block();
        } catch (Exception e) {
            log.error("Erreur appel MatchService pour competition {}: {}", competitionId, e.getMessage());
            return Collections.emptyList();
        }
    }

    private Map<String, Object> getUserInfoFromToken(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + token);
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        try {
            ResponseEntity<Map> response = restTemplate.exchange(
                    userServiceUrl,
                    HttpMethod.GET,
                    entity,
                    Map.class
            );

            Map<String, Object> userInfo = response.getBody();
            if (userInfo == null) {
                throw new UnauthorizedException("Token invalide");
            }
            return userInfo;

        } catch (HttpClientErrorException.Unauthorized e) {
            throw new UnauthorizedException("Token invalide ou expiré");
        } catch (HttpClientErrorException.Forbidden e) {
            throw new ForbiddenException("Accès refusé");
        }
    }

    @SuppressWarnings("unchecked")
    private void checkOrganizerOrAdminRole(Map<String, Object> userInfo) {
        // Nouveau format : "roles" est une List<String> depuis la migration
        Object rolesObj = userInfo.get("roles");

        if (rolesObj == null) {
            throw new ForbiddenException("Rôle introuvable dans le token");
        }

        List<String> roles = (List<String>) rolesObj;

        boolean isAllowed = roles.contains("ADMIN") || roles.contains("ORGANIZER");
        if (!isAllowed) {
            throw new ForbiddenException("Seuls les ADMIN ou ORGANIZER peuvent créer un événement");
        }
    }
}