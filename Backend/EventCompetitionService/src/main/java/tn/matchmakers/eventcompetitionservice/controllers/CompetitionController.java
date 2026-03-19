package tn.matchmakers.eventcompetitionservice.controllers;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.matchmakers.eventcompetitionservice.dto.external.MatchIdsCallbackRequest;
import tn.matchmakers.eventcompetitionservice.entities.Competition;
import tn.matchmakers.eventcompetitionservice.repositories.CompetitionRepository;
import tn.matchmakers.eventcompetitionservice.services.CompetitionServiceImpl;

import java.util.List;

@RestController
@RequestMapping("/api/competitions")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:4200"})
public class CompetitionController {
    private final CompetitionServiceImpl competitionService;
    private final CompetitionRepository competitionRepository;

    @GetMapping
    public ResponseEntity<List<Competition>> getAll() {
        return ResponseEntity.ok(competitionService.getAll());
    }

    // GET competition par ID
    @GetMapping("/{id}")
    public ResponseEntity<Competition> getById(@PathVariable String id) {
        return competitionRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
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
    // Callback depuis match-service
    // match-service appelle cet endpoint après avoir généré les matches
    @PutMapping("/{id}/matches")
    public ResponseEntity<Competition> updateMatchIds(
            @PathVariable String id,
            @RequestBody MatchIdsCallbackRequest request) {

        Competition competition = competitionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Competition non trouvée: " + id));

        competition.setMatchIds(request.getMatchIds());
        Competition saved = competitionRepository.save(competition);
        return ResponseEntity.ok(saved);
    }
    // ─── Ajouter un matchId unique (appelé match par match)
    @PatchMapping("/{id}/matches/{matchId}")
    public ResponseEntity<Competition> addMatchId(
            @PathVariable String id,
            @PathVariable String matchId) {

        Competition competition = competitionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Competition non trouvée: " + id));

        if (!competition.getMatchIds().contains(matchId)) {
            competition.getMatchIds().add(matchId);
            competitionRepository.save(competition);
        }
        return ResponseEntity.ok(competition);
    }
}