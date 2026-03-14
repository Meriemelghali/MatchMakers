package tn.matchmakers.eventcompetitionservice.services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import tn.matchmakers.eventcompetitionservice.dto.EventCreateDto;
import tn.matchmakers.eventcompetitionservice.dto.EventResponseDto;
import tn.matchmakers.eventcompetitionservice.entities.Event;
import tn.matchmakers.eventcompetitionservice.entities.enums.StatutEvent;
import tn.matchmakers.eventcompetitionservice.exceptions.DuplicateEntityException;
import tn.matchmakers.eventcompetitionservice.exceptions.ForbiddenException;
import tn.matchmakers.eventcompetitionservice.exceptions.UnauthorizedException;
import tn.matchmakers.eventcompetitionservice.repositories.EventRepository;
import tn.matchmakers.eventcompetitionservice.services.serviceInterfaces.EventService;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class EventServiceImpl implements EventService {
    private final EventRepository eventRepository;
    private final RestTemplate restTemplate;

    private final String userServiceUrl = "http://localhost:8081/users/auth/validate-token";

    @Override
    public EventResponseDto createEvent(EventCreateDto dto, String token) {

        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + token);
        HttpEntity<Void> entity = new HttpEntity<>(headers);

        ResponseEntity<Map> response;

        try {
            response = restTemplate.exchange(
                    userServiceUrl,
                    HttpMethod.GET,
                    entity,
                    Map.class
            );
        } catch (HttpClientErrorException.Unauthorized e) {
            throw new UnauthorizedException("Token invalide ou expiré");
        } catch (HttpClientErrorException.Forbidden e) {
            throw new ForbiddenException("Accès refusé");
        }

        Map<String, Object> userInfo = response.getBody();

        if (userInfo == null) {
            throw new UnauthorizedException("Token invalide");
        }

        // Vérification du rôle
        Object roleObj = userInfo.get("role");

        if (!"ADMIN".equals(roleObj)) {
            throw new ForbiddenException("Seuls les Admins peuvent créer un événement");
        }

        // createdBy
        String userId = String.valueOf(userInfo.get("id"));
        String firstName = String.valueOf(userInfo.get("firstName"));
        String lastName = String.valueOf(userInfo.get("lastName"));

        Map<String, String> createdByMap = Map.of(
                "id", userId,
                "name", (firstName + " " + lastName).trim()
        );

        if (eventRepository.existsByName(dto.getName())) {
            throw new DuplicateEntityException("Name already exists");
        }

        Event event = new Event();
        event.setName(dto.getName());
        event.setDescription(dto.getDescription());
        event.setLocation(dto.getLocation());
        event.setStartDate(dto.getStartDate());
        event.setEndDate(dto.getEndDate());
        event.setStatutEvent(StatutEvent.PLANNED);
        event.setCreatedBy(createdByMap);

        Event savedEvent = eventRepository.save(event);
        return new EventResponseDto(savedEvent);
    }
}