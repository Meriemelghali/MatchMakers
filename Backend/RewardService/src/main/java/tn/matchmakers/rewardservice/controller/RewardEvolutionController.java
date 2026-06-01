package tn.matchmakers.rewardservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.matchmakers.rewardservice.dto.RewardEvolutionPreviewDto;
import tn.matchmakers.rewardservice.dto.RewardProgressRequest;
import tn.matchmakers.rewardservice.service.RewardEvolutionService;

@RestController
@RequestMapping("/api/rewards")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class RewardEvolutionController {

    // Gere les actions "progress" et "evolve" (level up) sur une recompense.
    private final RewardEvolutionService evolutionService;

    @PostMapping("/{id}/progress")
    public ResponseEntity<RewardEvolutionPreviewDto> progress(@PathVariable("id") String rewardId,
                                                             @Valid @RequestBody RewardProgressRequest request) {
        // Ajoute un delta de progression. Peut declencher une evolution si autoEvolve=true.
        return ResponseEntity.ok(evolutionService.addProgress(rewardId, request));
    }

    @PostMapping("/{id}/evolve")
    public ResponseEntity<RewardEvolutionPreviewDto> evolve(@PathVariable("id") String rewardId) {
        // Force l'evolution (si progress >= maxProgress et evolutive=true).
        return ResponseEntity.ok(evolutionService.evolveNow(rewardId));
    }
}

