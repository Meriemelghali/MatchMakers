package tn.matchmakers.userservice.controllers;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.matchmakers.userservice.entities.User;
import tn.matchmakers.userservice.services.UserAIService;
import tn.matchmakers.userservice.services.serviceInterfaces.UserService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:4200", "http://127.0.0.1:4200"})
public class AIController {

    private final UserAIService userAIService;
    private final UserService userService;

    @GetMapping("/sport-inspiration/{userId}")
    public ResponseEntity<Map<String, Object>> getSportInspiration(@PathVariable String userId) {
        User user = userService.getUserById(userId);
        Map<String, Object> inspiration = userAIService.getSportQuote(user.getFavoriteSports());
        return ResponseEntity.ok(inspiration);
    }

    @PutMapping("/score/{userId}")
    public ResponseEntity<Void> updateScore(@PathVariable String userId, @RequestParam Integer points) {
        userService.updateFairPlayScore(userId, points);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/sanction/{userId}")
    public ResponseEntity<Void> applySanction(
            @PathVariable String userId,
            @RequestParam String message,
            @RequestParam String type,
            @RequestParam(required = false) Integer points) {
        userService.applySanction(userId, message, type, points);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/sanction/{userId}/message")
    public ResponseEntity<Void> clearSanctionMessage(@PathVariable String userId) {
        userService.clearSanctionMessage(userId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/club-logo")
    public ResponseEntity<Map<String, Object>> generateClubLogo(@RequestBody Map<String, Object> request) {
        String name = (String) request.get("name");
        String description = (String) request.get("description");
        @SuppressWarnings("unchecked")
        List<String> sports = (List<String>) request.get("sports");
        
        Map<String, Object> result = userAIService.generateClubLogo(name, description, sports);
        return ResponseEntity.ok(result);
    }
}
