package tn.matchmakers.eventcompetitionservice.controllers;

import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.matchmakers.eventcompetitionservice.dto.EventCreateDto;
import tn.matchmakers.eventcompetitionservice.dto.EventResponseDto;
import tn.matchmakers.eventcompetitionservice.services.serviceInterfaces.EventService;

@RestController
@RequestMapping("/events")
@SecurityRequirement(name = "bearer-jwt")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:4200", "http://localhost:8080"})
public class EventController {

    private final EventService eventService;

    @PostMapping("/create")
    public ResponseEntity<EventResponseDto> createEvent(
            @RequestBody EventCreateDto eventCreateDto,
            @RequestHeader("Authorization") String authorization
    ) {
        // Extraire le token sans "Bearer "
        String token = authorization.replace("Bearer ", "");

        EventResponseDto response = eventService.createEvent(eventCreateDto, token);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
