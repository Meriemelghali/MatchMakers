package tn.matchmakers.matchservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tn.matchmakers.matchservice.dto.AiLeaderboardRequest;
import tn.matchmakers.matchservice.dto.AiLeaderboardResponse;
import tn.matchmakers.matchservice.service.OpenAiLeaderboardService;

@RestController
@RequestMapping("/ai")
@RequiredArgsConstructor
public class AiController {

    private final OpenAiLeaderboardService ai;

    @PostMapping("/leaderboard")
    public ResponseEntity<AiLeaderboardResponse> leaderboard(@Valid @RequestBody AiLeaderboardRequest request) {
        return ResponseEntity.ok(ai.answer(request));
    }
}

