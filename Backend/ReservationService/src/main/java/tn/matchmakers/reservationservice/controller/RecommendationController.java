package tn.matchmakers.reservationservice.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.matchmakers.reservationservice.dto.RecommendationResponseDto;
import tn.matchmakers.reservationservice.service.impl.PythonRecommendationService;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/recommendations")
@RequiredArgsConstructor
@CrossOrigin("*")
public class RecommendationController {

    private final PythonRecommendationService recommendationService;

    /**
     * GET /api/recommendations?dateTime=...&userId=...&sportType=...
     * Recommandations personnalisées (v2)
     */
    @GetMapping
    public ResponseEntity<RecommendationResponseDto> getRecommendations(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime dateTime,
            @RequestParam(required = false) String userId,
            @RequestParam(required = false) String sportType) {
        return ResponseEntity.ok(recommendationService.getRecommendations(dateTime, userId, sportType));
    }

    /**
     * GET /api/recommendations/heatmap?startDate=...&days=7&sportType=...&userId=...&terrainIds=...
     * Heatmap de disponibilités multi-terrain sur N jours
     */
    @GetMapping("/heatmap")
    public ResponseEntity<Object> getHeatmap(
            @RequestParam String startDate,
            @RequestParam(defaultValue = "7") int days,
            @RequestParam(required = false) String sportType,
            @RequestParam(required = false) String userId,
            @RequestParam(required = false) List<String> terrainIds) {
        return ResponseEntity.ok(recommendationService.getHeatmap(startDate, days, sportType, userId, terrainIds));
    }
}

