package tn.matchmakers.eventcompetitionservice.controllers;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.matchmakers.eventcompetitionservice.dto.EventCreateDto;
import tn.matchmakers.eventcompetitionservice.dto.EventResponseDto;
import tn.matchmakers.eventcompetitionservice.dto.external.MatchDto;
import tn.matchmakers.eventcompetitionservice.dto.external.SportDto;
import tn.matchmakers.eventcompetitionservice.entities.Event;
import tn.matchmakers.eventcompetitionservice.entities.enums.StatutEvent;
import tn.matchmakers.eventcompetitionservice.services.serviceInterfaces.EventService;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/events")
@SecurityRequirement(name = "bearer-jwt")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:4200", "http://localhost:8080"})
public class EventController {

    private final EventService eventService;

    @GetMapping
    public ResponseEntity<List<Event>> getAll() {
        return ResponseEntity.ok(eventService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Event> getById(@PathVariable String id) {
        return ResponseEntity.ok(eventService.getById(id));
    }

    @PostMapping
    public ResponseEntity<EventResponseDto> create(
            @RequestBody EventCreateDto dto,
            @RequestHeader("Authorization") String authHeader) {
        // Extrait le token du header "Bearer <token>"
        String token = authHeader.replace("Bearer ", "").trim();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(eventService.createEvent(dto, token));
    }
    @PutMapping("/{id}")
    public ResponseEntity<Event> update(
            @PathVariable String id,
            @RequestBody EventCreateDto dto) {
        return ResponseEntity.ok(eventService.update(id, dto));
    }
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        eventService.delete(id);
        return ResponseEntity.noContent().build();
    }
    @PatchMapping("/{id}/statut")
    public ResponseEntity<Event> changeStatut(
            @PathVariable String id,
            @RequestParam StatutEvent statut) {
        return ResponseEntity.ok(eventService.changeStatut(id, statut));
    }

    @GetMapping("/statut/{statut}")
    public ResponseEntity<List<Event>> getByStatut(@PathVariable StatutEvent statut) {
        return ResponseEntity.ok(eventService.getByStatut(statut));
    }

    @GetMapping("/organizer/{userId}")
    public ResponseEntity<List<Event>> getByOrganizer(@PathVariable String userId) {
        return ResponseEntity.ok(eventService.getByOrganizer(userId));
    }

    @GetMapping("/range")
    public ResponseEntity<List<Event>> getByDateRange(
            @RequestParam @org.springframework.format.annotation.DateTimeFormat(
                    iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @org.springframework.format.annotation.DateTimeFormat(
                    iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE) LocalDate to) {
        return ResponseEntity.ok(eventService.getByDateRange(from, to));
    }

    // ─── Données enrichies depuis autres services ─────────────────────────────

    @GetMapping("/{id}/sport")
    public ResponseEntity<SportDto> getSportDetails(@PathVariable String id) {
        Event event = eventService.getById(id);
        return ResponseEntity.ok(eventService.getSportDetails(event.getSportId()));
    }

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
}
