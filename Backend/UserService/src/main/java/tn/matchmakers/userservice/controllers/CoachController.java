package tn.matchmakers.userservice.controllers;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.matchmakers.userservice.entities.User;
import tn.matchmakers.userservice.repositories.UserRepository;
import tn.matchmakers.userservice.services.UserAIService;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/coach")
@RequiredArgsConstructor
public class CoachController {

    private final UserAIService aiService;
    private final UserRepository userRepository;

    @GetMapping("/today-plan/{userId}")
    public ResponseEntity<Map<String, Object>> getTodayPlan(@PathVariable String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Map<String, Object> profile = new HashMap<>();
        profile.put("userId", userId);
        profile.put("level", user.getFitnessLevel());
        profile.put("goals", user.getFitnessGoals());
        profile.put("sports", user.getFavoriteSports());
        profile.put("weight", user.getWeight());
        profile.put("height", user.getHeight());

        return ResponseEntity.ok(aiService.getTodayTrainingPlan(profile));
    }

    @PostMapping("/chat/{userId}")
    public ResponseEntity<Map<String, Object>> chatWithCoach(
            @PathVariable String userId,
            @RequestBody Map<String, String> request) {
        String message = request.get("message");
        return ResponseEntity.ok(aiService.askCoachAssistant(userId, message));
    }
}
