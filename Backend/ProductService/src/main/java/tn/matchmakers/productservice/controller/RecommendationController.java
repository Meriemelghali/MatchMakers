package tn.matchmakers.productservice.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.matchmakers.productservice.dto.RecommendationResponseDTO;
import tn.matchmakers.productservice.service.RecommendationService;
import java.util.List;

@RestController
@RequestMapping("/api/recommendations")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class RecommendationController {

    private final RecommendationService recommendationService;

    // ✅ Top produits — page liste
    @GetMapping("/top")
    public ResponseEntity<List<RecommendationResponseDTO>> getTop(
            @RequestParam(defaultValue = "6") int topK) {
        return ResponseEntity.ok(
            recommendationService.getTopRecommendations(topK)
        );
    }

    // ✅ Produits similaires — page détail
    @GetMapping("/similar/{productId}")
    public ResponseEntity<List<RecommendationResponseDTO>> getSimilar(
            @PathVariable String productId,
            @RequestParam(defaultValue = "4") int topK) {
        return ResponseEntity.ok(
            recommendationService.getSimilarProducts(productId, topK)
        );
    }
}