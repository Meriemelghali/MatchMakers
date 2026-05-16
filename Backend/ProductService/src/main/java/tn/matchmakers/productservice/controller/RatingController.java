package tn.matchmakers.productservice.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import tn.matchmakers.productservice.dto.RatingRequestDTO;
import tn.matchmakers.productservice.dto.RatingResponseDTO;
import tn.matchmakers.productservice.service.RatingService;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ratings")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200")
public class RatingController {

    private final RatingService ratingService;

    @PostMapping
    public ResponseEntity<RatingResponseDTO> addOrUpdate(
            @RequestBody RatingRequestDTO dto) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(ratingService.addOrUpdateRating(dto));
    }

    @GetMapping("/product/{productId}")
    public ResponseEntity<List<RatingResponseDTO>> getByProduct(
            @PathVariable String productId) {
        return ResponseEntity.ok(ratingService.getRatingsByProduct(productId));
    }

    @GetMapping("/product/{productId}/average")
    public ResponseEntity<Map<String, Double>> getAverage(
            @PathVariable String productId) {
        return ResponseEntity.ok(Map.of(
            "average", ratingService.getAverageRating(productId)
        ));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        ratingService.deleteRating(id);
        return ResponseEntity.noContent().build();
    }
}