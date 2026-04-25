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

    private final RewardEvolutionService evolutionService;

    @PostMapping("/{id}/progress")
    public ResponseEntity<RewardEvolutionPreviewDto> progress(@PathVariable("id") String rewardId,
                                                             @Valid @RequestBody RewardProgressRequest request) {
        return ResponseEntity.ok(evolutionService.addProgress(rewardId, request));
    }

    @PostMapping("/{id}/evolve")
    public ResponseEntity<RewardEvolutionPreviewDto> evolve(@PathVariable("id") String rewardId) {
        return ResponseEntity.ok(evolutionService.evolveNow(rewardId));
    }
}

