package tn.matchmakers.eventcompetitionservice.controllers;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.matchmakers.eventcompetitionservice.client.TerrainServiceClient;
import tn.matchmakers.eventcompetitionservice.dto.EventResponseDto;
import tn.matchmakers.eventcompetitionservice.dto.external.MatchDto;
import tn.matchmakers.eventcompetitionservice.dto.external.SportDto;
import tn.matchmakers.eventcompetitionservice.dto.CreateEventRequest;
import tn.matchmakers.eventcompetitionservice.dto.UpdateEventRequest;
import tn.matchmakers.eventcompetitionservice.entities.Event;
import tn.matchmakers.eventcompetitionservice.entities.enums.StatutEvent;
import tn.matchmakers.eventcompetitionservice.services.serviceInterfaces.EventService;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/events")
@SecurityRequirement(name = "bearer-jwt")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:4200", "http://localhost:8080"})
public class EventController {

    private final EventService eventService;
    private final TerrainServiceClient terrainServiceClient;

    //  GET ALL
    @GetMapping
    public ResponseEntity<List<Event>> getAll() {
        return ResponseEntity.ok(eventService.getAll());
    }

    //  GET BY ID
    @GetMapping("/{id}")
    public ResponseEntity<Event> getById(@PathVariable String id) {
        return ResponseEntity.ok(eventService.getById(id));
    }

    //  CREATE
    @PostMapping
    public ResponseEntity<EventResponseDto> create(
            @Valid @RequestBody CreateEventRequest dto,        // ← CreateEventRequest
            @RequestHeader("Authorization") String authHeader) {
        String token = authHeader.replace("Bearer ", "").trim();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(eventService.createEvent(dto, token));
    }

    //  UPDATE
    @PutMapping("/{id}")
    public ResponseEntity<EventResponseDto> update(  // ← EventResponseDto au lieu de Event
                                                     @PathVariable String id,
                                                     @Valid @RequestBody UpdateEventRequest dto,        // ← UpdateEventRequest
                                                     @RequestHeader("Authorization") String authHeader) {
        String token = authHeader.replace("Bearer ", "").trim();
        return ResponseEntity.ok(eventService.update(id, dto, token));
    }

    //  DELETE
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        eventService.delete(id);
        return ResponseEntity.noContent().build();
    }

    //  CHANGE STATUT
    @PatchMapping("/{id}/statut")
    public ResponseEntity<Event> changeStatut(
            @PathVariable String id,
            @RequestParam StatutEvent statut) {
        return ResponseEntity.ok(eventService.changeStatut(id, statut));
    }

    //  GET BY STATUT
    @GetMapping("/statut/{statut}")
    public ResponseEntity<List<Event>> getByStatut(@PathVariable StatutEvent statut) {
        return ResponseEntity.ok(eventService.getByStatut(statut));
    }

    //  GET BY ORGANIZER
    @GetMapping("/organizer/{userId}")
    public ResponseEntity<List<Event>> getByOrganizer(@PathVariable String userId) {
        return ResponseEntity.ok(eventService.getByOrganizer(userId));
    }

    //  GET BY DATE RANGE
    @GetMapping("/range")
    public ResponseEntity<List<Event>> getByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(eventService.getByDateRange(from, to));
    }

    //  TEAM JOIN
    @PostMapping("/{id}/teams/{teamId}")
    public ResponseEntity<EventResponseDto> joinTeam(
            @PathVariable String id,
            @PathVariable String teamId,
            @RequestHeader("Authorization") String authHeader) {
        String token = authHeader.replace("Bearer ", "").trim();
        return ResponseEntity.ok(eventService.joinTeam(id, teamId, token));
    }

    //  TEAM LEAVE
    @DeleteMapping("/{id}/teams/{teamId}")
    public ResponseEntity<EventResponseDto> leaveTeam(
            @PathVariable String id,
            @PathVariable String teamId,
            @RequestHeader("Authorization") String authHeader) {
        String token = authHeader.replace("Bearer ", "").trim();
        return ResponseEntity.ok(eventService.leaveTeam(id, teamId, token));
    }

    //  GET SPORT DETAILS
    @GetMapping("/{id}/sport")
    public ResponseEntity<SportDto> getSportDetails(@PathVariable String id) {
        Event event = eventService.getById(id);
        return ResponseEntity.ok(eventService.getSportDetails(event.getSportId()));
    }

    //  GET MATCHES
    @GetMapping("/{id}/matches")
    public ResponseEntity<List<MatchDto>> getMatches(@PathVariable String id) {
        Event event = eventService.getById(id);
        if (event.getCompetition() == null) {
            return ResponseEntity.ok(List.of());
        }
        return ResponseEntity.ok(
                eventService.getMatchesForCompetition(event.getCompetition().getId())
        );
    }
    // GET BY LOCATION
    // GET /api/events/location?city=Tunis
    @GetMapping("/location")
    public ResponseEntity<List<Event>> getByLocation(
            @RequestParam String city) {
        return ResponseEntity.ok(eventService.getByLocation(city));
    }

    // GET /api/events/location?city=Tunis&statut=PLANNED
    // Par défaut retourne seulement les events PLANNED dans la région
    @GetMapping("/location/planned")
    public ResponseEntity<List<Event>> getByLocationPlanned(
            @RequestParam String city) {
        return ResponseEntity.ok(
                eventService.getByLocationAndStatut(city, StatutEvent.PLANNED)
        );
    }

    // ─── VÉRIFIER DISPONIBILITÉ TERRAIN ──────────────────────────────────────
    @GetMapping("/terrain/{terrainId}/disponibilite")
    public ResponseEntity<Map<String, Boolean>> verifierDisponibilite(
            @PathVariable String terrainId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime debut,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fin) {
        return ResponseEntity.ok(
                terrainServiceClient.verifierDisponibilite(terrainId, debut, fin)
        );
    }
}