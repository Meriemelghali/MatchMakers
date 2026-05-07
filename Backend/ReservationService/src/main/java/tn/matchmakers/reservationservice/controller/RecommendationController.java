package tn.matchmakers.reservationservice.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.matchmakers.reservationservice.dto.RecommendationResponseDto;
import tn.matchmakers.reservationservice.service.impl.PythonRecommendationService;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/recommendations")
@RequiredArgsConstructor
@CrossOrigin("*")
public class RecommendationController {

    private final PythonRecommendationService recommendationService;

    @GetMapping
    public ResponseEntity<RecommendationResponseDto> getRecommendations(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime dateTime) {
        return ResponseEntity.ok(recommendationService.getRecommendations(dateTime));
    }
}
