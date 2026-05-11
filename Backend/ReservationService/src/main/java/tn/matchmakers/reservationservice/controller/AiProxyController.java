package tn.matchmakers.reservationservice.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.matchmakers.reservationservice.service.impl.PythonRecommendationService;

import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@CrossOrigin("*")
public class AiProxyController {

    private final PythonRecommendationService recommendationService;

    @PostMapping("/evaluate")
    public ResponseEntity<Object> evaluateChoice(
            @RequestBody Map<String, Object> request,
            @RequestParam(required = false) String userId) {
        return ResponseEntity.ok(recommendationService.evaluateChoice(request, userId));
    }

    @PostMapping("/best-slots")
    public ResponseEntity<Object> getBestSlots(
            @RequestBody Map<String, Object> request,
            @RequestParam(required = false) String userId) {
        return ResponseEntity.ok(recommendationService.getBestSlots(request, userId));
    }
}
