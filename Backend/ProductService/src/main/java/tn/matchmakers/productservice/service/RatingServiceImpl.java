package tn.matchmakers.productservice.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tn.matchmakers.productservice.dto.RatingRequestDTO;
import tn.matchmakers.productservice.dto.RatingResponseDTO;
import tn.matchmakers.productservice.entity.Rating;
import tn.matchmakers.productservice.repository.RatingRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RatingServiceImpl implements RatingService {

    private final RatingRepository ratingRepository;

    @Override
    public RatingResponseDTO addOrUpdateRating(RatingRequestDTO dto) {
        // ✅ Un user = un avis par produit
        Rating rating = ratingRepository
            .findByProductIdAndUserId(dto.getProductId(), dto.getUserId())
            .orElse(Rating.builder()
                .productId(dto.getProductId())
                .userId(dto.getUserId())
                .createdAt(LocalDateTime.now())
                .build());

        rating.setUserName(dto.getUserName());
        rating.setStars(Math.min(5, Math.max(1, dto.getStars())));
        rating.setComment(dto.getComment());
        if (rating.getCreatedAt() == null)
            rating.setCreatedAt(LocalDateTime.now());

        return toDTO(ratingRepository.save(rating));
    }

    @Override
    public List<RatingResponseDTO> getRatingsByProduct(String productId) {
        return ratingRepository.findByProductId(productId)
            .stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Override
    public void deleteRating(String id) {
        ratingRepository.deleteById(id);
    }

    @Override
    public double getAverageRating(String productId) {
        List<Rating> ratings = ratingRepository.findByProductId(productId);
        if (ratings.isEmpty()) return 0.0;
        return ratings.stream()
            .mapToInt(Rating::getStars)
            .average()
            .orElse(0.0);
    }

    private RatingResponseDTO toDTO(Rating r) {
        return RatingResponseDTO.builder()
            .id(r.getId())
            .productId(r.getProductId())
            .userId(r.getUserId())
            .userName(r.getUserName())
            .stars(r.getStars())
            .comment(r.getComment())
            .createdAt(r.getCreatedAt())
            .build();
    }
}