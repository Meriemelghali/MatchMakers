package tn.matchmakers.eventcompetitionservice.controllers;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.matchmakers.eventcompetitionservice.entities.Competition;
import tn.matchmakers.eventcompetitionservice.services.CompetitionServiceImpl;

import java.util.List;

@RestController
@RequestMapping("/api/competitions")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:4200"})
public class CompetitionController {
    private final CompetitionServiceImpl competitionService;

    @GetMapping
    public ResponseEntity<List<Competition>> getAll() {
        return ResponseEntity.ok(competitionService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Competition> getById(@PathVariable String id) {
        return ResponseEntity.ok(competitionService.getById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Competition> update(@PathVariable String id, @RequestBody Competition competition) {
        return ResponseEntity.ok(competitionService.update(id, competition));
    }

    @PostMapping("/{id}/teams/{teamId}")
    public ResponseEntity<Competition> addTeam(@PathVariable String id, @PathVariable String teamId) {
        return ResponseEntity.ok(competitionService.addTeam(id, teamId));
    }

    @PostMapping("/{id}/matches/{matchId}")
    public ResponseEntity<Competition> addMatch(@PathVariable String id, @PathVariable String matchId) {
        return ResponseEntity.ok(competitionService.addMatch(id, matchId));
    }
}