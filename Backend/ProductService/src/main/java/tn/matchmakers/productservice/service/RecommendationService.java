package tn.matchmakers.productservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import tn.matchmakers.productservice.dto.*;
import tn.matchmakers.productservice.entity.Product;
import tn.matchmakers.productservice.entity.Rating;
import tn.matchmakers.productservice.repository.OrderRepository;
import tn.matchmakers.productservice.repository.ProductRepository;
import tn.matchmakers.productservice.repository.RatingRepository;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RecommendationService {

    private final ProductRepository productRepository;
    private final OrderRepository   orderRepository;
    private final RatingRepository  ratingRepository;

  private final WebClient aiClient = WebClient.builder()
    .baseUrl("http://localhost:8001")
    .build();
    // ── Top produits ──
    public List<RecommendationResponseDTO> getTopRecommendations(int topK) {
        List<Product> products = productRepository.findAll();

        RecommendationRequestDTO request = RecommendationRequestDTO.builder()
            .products(buildScoreDTOs(products))
            .userSport(null)
            .topK(topK)
            .build();

        List<ScoredProductDTO> scored = callAI("/recommend", request);
        return enrichResults(scored, products);
    }

    // ── Produits similaires ──
    public List<RecommendationResponseDTO> getSimilarProducts(String productId, int topK) {
        Product target = productRepository.findById(productId)
            .orElseThrow(() -> new RuntimeException("Produit introuvable"));

        List<Product> candidates = productRepository.findAll();

        SimilarRequestDTO request = SimilarRequestDTO.builder()
            .targetProduct(buildScoreDTO(target))
            .candidates(
                candidates.stream()
                    .filter(p -> !p.getId().equals(productId))
                    .map(this::buildScoreDTO)
                    .collect(Collectors.toList())
            )
            .topK(topK)
            .build();

        List<ScoredProductDTO> scored = callAI("/similar", request);
        return enrichResults(scored, candidates);
    }

    // ── Appel WebClient ──
    private List<ScoredProductDTO> callAI(String path, Object body) {
        try {
            return aiClient.post()
                .uri(path)
                .bodyValue(body)
                .retrieve()
                .bodyToFlux(ScoredProductDTO.class)
                .collectList()
                .block();
        } catch (Exception e) {
            log.error("Erreur appel IA {} : {}", path, e.getMessage());
            return List.of();
        }
    }

    // ── Construire ProductScoreDTO ──
    private ProductScoreDTO buildScoreDTO(Product p) {
        List<Rating> ratings = ratingRepository.findByProductId(p.getId());
        long orders = orderRepository.countByProductId(p.getId());

        double avgRating = ratings.stream()
            .mapToInt(Rating::getStars)   // ← champ 'stars' de votre entité Rating
            .average()
            .orElse(0.0);

        return ProductScoreDTO.builder()
            .id(p.getId())
            .name(p.getName())
            .sport(p.getSport())
            .type(p.getType().name())
            .averageRating(avgRating)
            .totalReviews(ratings.size())
            .totalOrders((int) orders)
            .build();
    }

    private List<ProductScoreDTO> buildScoreDTOs(List<Product> products) {
        return products.stream()
            .map(this::buildScoreDTO)
            .collect(Collectors.toList());
    }

    // ── Enrichir résultats ──
    private List<RecommendationResponseDTO> enrichResults(
            List<ScoredProductDTO> scored, List<Product> products) {

        Map<String, Product> map = products.stream()
            .collect(Collectors.toMap(Product::getId, p -> p));

        return scored.stream()
            .filter(s -> map.containsKey(s.getId()))
            .map(s -> {
                Product p = map.get(s.getId());
                return RecommendationResponseDTO.builder()
                    .id(p.getId())
                    .score(s.getScore())
                    .reason(s.getReason())
                    .name(p.getName())
                    .sport(p.getSport())
                    .type(p.getType().name())
                    .imageUrl(p.getImageUrl())
                    .price(p.getPrice())
                    .rentalPricePerHour(p.getRentalPricePerHour())
                    .averageRating(s.getScore())
                    .build();
            })
            .collect(Collectors.toList());
    }
}