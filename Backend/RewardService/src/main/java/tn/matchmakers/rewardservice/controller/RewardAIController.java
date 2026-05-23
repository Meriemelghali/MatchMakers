package tn.matchmakers.rewardservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.matchmakers.rewardservice.dto.RewardAIGenerateRequest;
import tn.matchmakers.rewardservice.dto.RewardAISuggestionDto;
import tn.matchmakers.rewardservice.service.RewardAIService;

import java.util.List;

@RestController
@RequestMapping("/api/ai/rewards")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class RewardAIController {

    // Service IA cote Spring: appelle PythonAI si dispo, sinon fallback local.
    private final RewardAIService aiService;

    @PostMapping("/generate")
    public ResponseEntity<List<RewardAISuggestionDto>> generate(@Valid @RequestBody RewardAIGenerateRequest request) {
        // Endpoint: POST /api/ai/rewards/generate
        // Retour: liste de suggestions (name/description/type/rarity/points).
        return ResponseEntity.ok(aiService.generateRewards(request));
    }
}

