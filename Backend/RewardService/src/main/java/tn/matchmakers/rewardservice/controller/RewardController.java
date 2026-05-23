package tn.matchmakers.rewardservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.matchmakers.rewardservice.dto.*;
import tn.matchmakers.rewardservice.service.RewardService;

import java.util.List;

@RestController
@RequestMapping("/api/rewards")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class RewardController {

    // Service metier: toute la logique CRUD + queries est dans RewardServiceImpl.
    private final RewardService service;

    @PostMapping
    public ResponseEntity<RewardDto> create(@Valid @RequestBody RewardCreateRequest request) {
        // Cree une recompense. Si les contraintes de validation echouent -> 400 (Spring Validation).
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(request));
    }

    @GetMapping
    public ResponseEntity<List<RewardDto>> getAll() {
        // Retourne toutes les recompenses (Mongo: findAll).
        return ResponseEntity.ok(service.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<RewardDto> getOne(@PathVariable String id) {
        // Retourne une recompense par id (sinon 404).
        return ResponseEntity.ok(service.get(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<RewardDto> update(@PathVariable String id,
                                            @Valid @RequestBody RewardUpdateRequest request) {
        // Update partiel: seuls les champs non-null du request sont appliques.
        return ResponseEntity.ok(service.update(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        // Suppression definitive (sinon 404 si id introuvable).
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<RewardDto>> byUser(@PathVariable String userId) {
        // Filtre DB: findByUserId(userId).
        return ResponseEntity.ok(service.getByUser(userId));
    }

    @GetMapping("/team/{teamId}")
    public ResponseEntity<List<RewardDto>> byTeam(@PathVariable String teamId) {
        // Filtre DB: findByTeamId(teamId).
        return ResponseEntity.ok(service.getByTeam(teamId));
    }
}

