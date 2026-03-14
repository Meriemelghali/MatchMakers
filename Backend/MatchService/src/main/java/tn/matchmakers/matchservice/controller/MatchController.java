package tn.matchmakers.matchservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.matchmakers.matchservice.dto.*;
import tn.matchmakers.matchservice.enums.MatchStatus;
import tn.matchmakers.matchservice.enums.MatchType;
import tn.matchmakers.matchservice.service.MatchService;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/")
@RequiredArgsConstructor
public class MatchController {

    private final MatchService matchService;

    @PostMapping
    public ResponseEntity<MatchDTO> creerMatch(@Valid @RequestBody CreateMatchRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(matchService.creerMatch(request));
    }

    @GetMapping
    public ResponseEntity<List<MatchDTO>> obtenirTousLesMatchs() {
        return ResponseEntity.ok(matchService.obtenirTousLesMatchs());
    }

    @GetMapping("/{id}")
    public ResponseEntity<MatchDTO> obtenirMatch(@PathVariable String id) {
        return ResponseEntity.ok(matchService.obtenirMatch(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<MatchDTO> mettreAJourMatch(@PathVariable String id,
            @Valid @RequestBody CreateMatchRequest request) {
        return ResponseEntity.ok(matchService.mettreAJourMatch(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> supprimerMatch(@PathVariable String id) {
        matchService.supprimerMatch(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/score")
    public ResponseEntity<MatchDTO> mettreAJourScore(@PathVariable String id,
            @Valid @RequestBody UpdateScoreRequest request) {
        return ResponseEntity.ok(matchService.mettreAJourScore(id, request));
    }

    @PatchMapping("/{id}/statut")
    public ResponseEntity<MatchDTO> mettreAJourStatut(@PathVariable String id,
            @Valid @RequestBody UpdateStatusRequest request) {
        return ResponseEntity.ok(matchService.mettreAJourStatut(id, request));
    }

    @GetMapping("/statut/{statut}")
    public ResponseEntity<List<MatchDTO>> filtrerParStatut(@PathVariable MatchStatus statut) {
        return ResponseEntity.ok(matchService.filtrerParStatut(statut));
    }

    @GetMapping("/type/{type}")
    public ResponseEntity<List<MatchDTO>> filtrerParType(@PathVariable MatchType type) {
        return ResponseEntity.ok(matchService.filtrerParType(type));
    }

    @GetMapping("/terrain/{terrainId}")
    public ResponseEntity<List<MatchDTO>> filtrerParTerrain(@PathVariable String terrainId) {
        return ResponseEntity.ok(matchService.filtrerParTerrain(terrainId));
    }

    @GetMapping("/periode")
    public ResponseEntity<List<MatchDTO>> filtrerParPeriode(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime debut,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fin) {
        return ResponseEntity.ok(matchService.filtrerParPeriode(debut, fin));
    }

    @PostMapping("/{matchId}/evenements")
    public ResponseEntity<MatchDTO> ajouterEvenement(@PathVariable String matchId,
            @Valid @RequestBody AddEventRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(matchService.ajouterEvenement(matchId, request));
    }

    @GetMapping("/{matchId}/evenements")
    public ResponseEntity<List<MatchEventDTO>> obtenirEvenements(@PathVariable String matchId) {
        return ResponseEntity.ok(matchService.obtenirEvenements(matchId));
    }

    @DeleteMapping("/{matchId}/evenements/{eventId}")
    public ResponseEntity<MatchDTO> supprimerEvenement(@PathVariable String matchId,
            @PathVariable String eventId) {
        return ResponseEntity.ok(matchService.supprimerEvenement(matchId, eventId));
    }
}
