package tn.matchmakers.eventcompetitionservice.services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.reactive.function.client.WebClient;
import tn.matchmakers.eventcompetitionservice.client.MatchServiceClient;
import tn.matchmakers.eventcompetitionservice.client.TerrainServiceClient;
import tn.matchmakers.eventcompetitionservice.dto.*;
import tn.matchmakers.eventcompetitionservice.dto.external.*;
import tn.matchmakers.eventcompetitionservice.entities.*;
import tn.matchmakers.eventcompetitionservice.entities.enums.*;
import tn.matchmakers.eventcompetitionservice.exceptions.*;
import tn.matchmakers.eventcompetitionservice.repositories.*;
import tn.matchmakers.eventcompetitionservice.services.serviceInterfaces.EventService;

import java.time.LocalDate;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class EventServiceImpl implements EventService {

    // ─── Repositories ─────────────────────────────────────────────────────────
    private final EventRepository eventRepository;
    private final EventTypeRepository eventTypeRepository;
    private final CompetitionRepository competitionRepository;

    // ─── Clients externes ─────────────────────────────────────────────────────
    private final RestTemplate restTemplate;
    private final EventValidationService validationService;
    private final MatchServiceClient matchServiceClient;
    private final TerrainServiceClient terrainServiceClient;

    @Qualifier("sportWebClient")
    private final WebClient sportWebClient;

    @Qualifier("matchWebClient")
    private final WebClient matchWebClient;

    private final String userServiceUrl = "http://localhost:8081/users/auth/validate-token";

    // ══════════════════════════════════════════════════════════════════════════
    // CRUD
    // ══════════════════════════════════════════════════════════════════════════

    @Override
    public EventResponseDto createEvent(CreateEventRequest dto, String token) {

        // 1. Valider token + rôle
        Map<String, Object> userInfo = getUserInfoFromToken(token);
        checkOrganizerOrAdminRole(userInfo);

        // 2. Construire createdBy
        Map<String, String> createdByMap = buildCreatedByMap(userInfo);

        // 3. Vérifier unicité du nom
        if (eventRepository.existsByName(dto.getName())) {
            throw new DuplicateEntityException("Un événement avec ce nom existe déjà");
        }

        // 4. Récupérer l'EventType
        EventType eventType = findEventTypeById(dto.getEventTypeId());

        // 5. Valider compatibilité sport / eventType
        validationService.validate(dto, eventType);

        // 6. Construire l'événement de base
        Event event = Event.builder()
                .name(dto.getName())
                .descriptionEvent(dto.getDescription())
                .startDate(dto.getStartDate())
                .endDate(dto.getEndDate())
                .location(dto.getLocation())
                .statutEvent(StatutEvent.PLANNED)
                .organizerUserId(createdByMap)
                .sportId(dto.getSportId())
                .clubId(dto.getClubId())
                .terrainId(dto.getTerrainId())
                .startPoint(dto.getStartPoint())
                .endPoint(dto.getEndPoint())
                .distances(dto.getDistances())
                .routePath(dto.getRoutePath())
                .participantIds(dto.getParticipantIds() != null ? dto.getParticipantIds() : new ArrayList<>())
                .eventType(eventType)
                .build();

        // 7. Branching selon le type d'événement
        applyEventTypeBranching(event, eventType, dto.getCompetitionName(),
                dto.getName(), dto.getMaxTeam(), dto.getFormat(), dto.getTeamIds());

        // 8. Sauvegarder
        Event savedEvent = eventRepository.save(event);

        // 9. Réserver le terrain
        if (dto.getTerrainId() != null) {
            try {
                CreateReservationRequest reservation = new CreateReservationRequest();
                reservation.setTerrainId(dto.getTerrainId());
                // temporaire
                reservation.setOrganisateurId(0L);
                //reservation.setOrganisateurId(userId); // après fix oussema
                reservation.setDateDebut(dto.getStartDate().atStartOfDay());
                reservation.setDateFin(dto.getEndDate().atTime(23, 59));
                reservation.setNotes("eventId:" + savedEvent.getId());
                terrainServiceClient.creerReservation(reservation);
                log.info("Terrain {} réservé pour l'événement {}",
                        dto.getTerrainId(), savedEvent.getId());
            } catch (Exception e) {
                log.warn("terrain-service indisponible — réservation ignorée: {}",
                        e.getMessage());
            }
        }

        // 10. Créer le match si Friendly Match ← NOUVEAU
        if (Boolean.TRUE.equals(eventType.getRequiresMatches())
                && !Boolean.TRUE.equals(eventType.getIsCompetition())) {
            try {
                CreateMatchRequest matchRequest = new CreateMatchRequest();
                matchRequest.setTitre(dto.getName());                           // ← titre
                matchRequest.setEquipe1(dto.getTeamIds().get(0));              // ← equipe1
                matchRequest.setEquipe2(dto.getTeamIds().get(1));              // ← equipe2
                matchRequest.setDateDebut(dto.getStartDate().atTime(15, 0));   // ← dateDebut
                matchRequest.setDateFin(dto.getStartDate().atTime(17, 0));     // ← dateFin
                matchRequest.setType(toMatchType(dto.getFormat()));
                matchRequest.setTerrainId(dto.getTerrainId());
                matchRequest.setDescription(dto.getDescription());
                MatchDto createdMatch = matchServiceClient.creerMatch(matchRequest);
                log.info("Match créé: {}", createdMatch.getId());
            } catch (Exception e) {
                log.warn("match-service indisponible — création match ignorée: {}",
                        e.getMessage());
            }
        }

        return new EventResponseDto(savedEvent);
    }

    @Override
    public List<Event> getAll() {
        return eventRepository.findAll();
    }

    @Override
    public Event getById(String id) {
        return eventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Événement non trouvé: " + id));
    }

    @Override
    public EventResponseDto update(String id, UpdateEventRequest dto, String token) {

        // 1. Valider token + rôle
        Map<String, Object> userInfo = getUserInfoFromToken(token);
        checkOrganizerOrAdminRole(userInfo);

        // 2. Récupérer l'événement existant
        Event existing = eventRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Événement non trouvé: " + id));

        // 3. Mettre à jour les champs de base (patch style)
        if (dto.getName() != null) {
            if (!dto.getName().equals(existing.getName())
                    && eventRepository.existsByName(dto.getName())) {
                throw new DuplicateEntityException("Un événement avec ce nom existe déjà");
            }
            existing.setName(dto.getName());
        }
        if (dto.getDescription() != null) existing.setDescriptionEvent(dto.getDescription());
        if (dto.getLocation() != null)    existing.setLocation(dto.getLocation());
        if (dto.getStartDate() != null)   existing.setStartDate(dto.getStartDate());
        if (dto.getEndDate() != null)     existing.setEndDate(dto.getEndDate());
        if (dto.getTerrainId() != null)   existing.setTerrainId(dto.getTerrainId());
        if (dto.getStartPoint() != null)  existing.setStartPoint(dto.getStartPoint());
        if (dto.getEndPoint() != null)    existing.setEndPoint(dto.getEndPoint());
        if (dto.getDistances() != null)   existing.setDistances(dto.getDistances());
        if (dto.getRoutePath() != null)   existing.setRoutePath(dto.getRoutePath());
        if (dto.getStatutEvent() != null) existing.setStatutEvent(dto.getStatutEvent());

        // 4. Mettre à jour équipes / participants
        if (dto.getTeamIds() != null) {
            existing.setTeamIds(dto.getTeamIds());
        }
        if (dto.getParticipantIds() != null) {
            existing.setParticipantIds(dto.getParticipantIds());
        }

        // 5. Mettre à jour la compétition si elle existe
        EventType eventType = existing.getEventType(); // ensure eventType is available
        if (Boolean.TRUE.equals(eventType.getIsCompetition())
                && existing.getCompetition() != null) {
            Competition competition = existing.getCompetition();
            if (dto.getCompetitionName() != null)
                competition.setNameCompetition(dto.getCompetitionName());
            if (dto.getMaxTeam() != null)
                competition.setMaxTeam(dto.getMaxTeam());
            if (dto.getFormat() != null)
                competition.setFormat(dto.getFormat());
            if (dto.getTeamIds() != null)
                competition.setTeamIds(new ArrayList<>(dto.getTeamIds()));
            competitionRepository.save(competition);
        }

        return new EventResponseDto(eventRepository.save(existing));
    }

    @Override
    public void delete(String id) {
        eventRepository.deleteById(id);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // MÉTIER
    // ══════════════════════════════════════════════════════════════════════════
    private String toMatchType(CompetitionFormat format) {
        if (format == null) return "AMICAL";
        return switch (format) {
            case LEAGUE      -> "CHAMPIONNAT";
            case KNOCKOUT    -> "COUPE";
            case TOURNAMENT  -> "TOURNOI";
            case FRIENDLY    -> "AMICAL";
        };
    }
    @Override
    public Event changeStatut(String id, StatutEvent statut) {
        Event event = getById(id);
        event.setStatutEvent(statut);
        return eventRepository.save(event);
    }

    @Override
    public Event assignCompetition(String eventId, String competitionId) {
        Event event = getById(eventId);
        Competition competition = competitionRepository.findById(competitionId)
                .orElseThrow(() -> new RuntimeException("Competition non trouvée: " + competitionId));
        event.setCompetition(competition);
        return eventRepository.save(event);
    }

    @Override
    public List<Event> getByStatut(StatutEvent statut) {
        return eventRepository.findByStatutEvent(statut);
    }

    @Override
    public List<Event> getByOrganizer(String userId) {
        return eventRepository.findByOrganizerId(userId);
    }

    @Override
    public List<Event> getByDateRange(LocalDate from, LocalDate to) {
        return eventRepository.findByStartDateBetween(from, to);
    }

    @Override
    public List<Event> getByLocation(String city) {
        // recherche insensible à la casse — "tunis" trouve "Tunis, Lac"
        return eventRepository.findByLocationContainingIgnoreCase(city);
    }
    @Override
    public List<Event> getByLocationAndStatut(String city, StatutEvent statut) {
        return eventRepository.findByLocationContainingIgnoreCaseAndStatutEvent(city, statut);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // GESTION ÉQUIPES
    // ══════════════════════════════════════════════════════════════════════════

    @Override
    public EventResponseDto joinTeam(String eventId, String teamId, String token) {
        getUserInfoFromToken(token); // valider token

        Event event = getById(eventId);
        EventType eventType = event.getEventType();

        // Vérifier que l'event accepte des équipes
        if (!Boolean.TRUE.equals(eventType.getRequiresTeams())) {
            throw new InvalidEventConfigException(
                    "Cet événement n'accepte pas d'équipes.");
        }

        // Cas compétition — vérifier maxTeam
        if (Boolean.TRUE.equals(eventType.getIsCompetition())
                && event.getCompetition() != null) {
            Competition competition = event.getCompetition();
            if (competition.getTeamIds().contains(teamId)) {
                throw new InvalidEventConfigException("Cette équipe est déjà inscrite.");
            }
            if (competition.getTeamIds().size() >= competition.getMaxTeam()) {
                throw new InvalidEventConfigException("Nombre maximum d'équipes atteint.");
            }
            competition.getTeamIds().add(teamId);
            competitionRepository.save(competition);

        } else {
            // Cas Friendly Match — équipes sur l'event directement
            if (event.getTeamIds() == null) event.setTeamIds(new ArrayList<>());
            if (event.getTeamIds().contains(teamId)) {
                throw new InvalidEventConfigException("Cette équipe est déjà inscrite.");
            }
            event.getTeamIds().add(teamId);
        }

        return new EventResponseDto(eventRepository.save(event));
    }

    @Override
    public EventResponseDto leaveTeam(String eventId, String teamId, String token) {
        getUserInfoFromToken(token); // valider token

        Event event = getById(eventId);
        EventType eventType = event.getEventType();

        if (Boolean.TRUE.equals(eventType.getIsCompetition())
                && event.getCompetition() != null) {
            Competition competition = event.getCompetition();
            if (!competition.getTeamIds().remove(teamId)) {
                throw new RuntimeException("Équipe non trouvée dans la compétition.");
            }
            competitionRepository.save(competition);

        } else {
            if (event.getTeamIds() == null || !event.getTeamIds().remove(teamId)) {
                throw new RuntimeException("Équipe non trouvée dans l'événement.");
            }
        }

        return new EventResponseDto(eventRepository.save(event));
    }

    @Override
    public EventResponseDto joinEvent(String eventId, String token) {
        Map<String, Object> userInfo = getUserInfoFromToken(token);
        String userId = String.valueOf(userInfo.get("id"));

        Event event = getById(eventId);
        EventType eventType = event.getEventType();

        if (Boolean.TRUE.equals(eventType.getIsCompetition())) {
            throw new InvalidEventConfigException("Veuillez rejoindre avec votre équipe pour une compétition.");
        }

        if (event.getParticipantIds() == null) {
            event.setParticipantIds(new ArrayList<>());
        }
        if (event.getParticipantIds().contains(userId)) {
            throw new InvalidEventConfigException("Vous participez déjà à cet événement.");
        }

        event.getParticipantIds().add(userId);
        return new EventResponseDto(eventRepository.save(event));
    }

    @Override
    public EventResponseDto leaveEvent(String eventId, String token) {
        Map<String, Object> userInfo = getUserInfoFromToken(token);
        String userId = String.valueOf(userInfo.get("id"));

        Event event = getById(eventId);
        
        if (event.getParticipantIds() == null || !event.getParticipantIds().remove(userId)) {
            throw new RuntimeException("Vous n'êtes pas inscrit à cet événement.");
        }

        return new EventResponseDto(eventRepository.save(event));
    }

    // ══════════════════════════════════════════════════════════════════════════
    // APPELS EXTERNES
    // ══════════════════════════════════════════════════════════════════════════

    @Override
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

    @Override
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

    // ══════════════════════════════════════════════════════════════════════════
    // HELPERS PRIVÉS
    // ══════════════════════════════════════════════════════════════════════════

    private Map<String, String> buildCreatedByMap(Map<String, Object> userInfo) {
        String userId    = String.valueOf(userInfo.get("id"));
        String firstName = String.valueOf(userInfo.get("firstName"));
        String lastName  = String.valueOf(userInfo.get("lastName"));
        return Map.of(
                "id",   userId,
                "name", (firstName + " " + lastName).trim()
        );
    }

    private EventType findEventTypeById(String id) {
        return eventTypeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("EventType non trouvé: " + id));
    }

    private void applyEventTypeBranching(Event event, EventType eventType,
                                         String competitionName, String eventName,
                                         Long maxTeam, CompetitionFormat format, List<String> teamIds) {

        // Branche A — compétition complète
        if (Boolean.TRUE.equals(eventType.getIsCompetition())) {
            Competition competition = Competition.builder()
                    .nameCompetition(competitionName != null
                            ? competitionName : "Compétition — " + eventName)
                    .maxTeam(maxTeam != null ? maxTeam : 0L)
                    .format(format)
                    .teamIds(teamIds != null ? new ArrayList<>(teamIds) : new ArrayList<>())
                    .status(CompetitionStatus.PENDING)
                    .build();
            event.setCompetition(competitionRepository.save(competition));

            // Branche B — équipes sans bracket (Friendly Match)
        } else if (Boolean.TRUE.equals(eventType.getRequiresTeams())) {
            if (teamIds != null && !teamIds.isEmpty()) {
                event.setTeamIds(teamIds);
            }
        }
        // Branche C — individuel simple → rien
    }

    private Map<String, Object> getUserInfoFromToken(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + token);
        HttpEntity<Void> entity = new HttpEntity<>(headers);
        try {
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    userServiceUrl, HttpMethod.GET, entity,
                    new ParameterizedTypeReference<Map<String, Object>>() {});
            Map<String, Object> userInfo = response.getBody();
            if (userInfo == null) throw new UnauthorizedException("Token invalide");
            return userInfo;
        } catch (HttpClientErrorException.Unauthorized e) {
            throw new UnauthorizedException("Token invalide ou expiré");
        } catch (HttpClientErrorException.Forbidden e) {
            throw new ForbiddenException("Accès refusé");
        }
    }

    @SuppressWarnings("unchecked")
    private void checkOrganizerOrAdminRole(Map<String, Object> userInfo) {
        Object rolesObj = userInfo.get("roles");
        if (rolesObj == null) throw new ForbiddenException("Rôle introuvable dans le token");
        List<String> roles = (List<String>) rolesObj;
        if (!roles.contains("ADMIN") && !roles.contains("ORGANIZER")) {
            throw new ForbiddenException("Seuls les ADMIN ou ORGANIZER peuvent gérer les événements");
        }
    }
}