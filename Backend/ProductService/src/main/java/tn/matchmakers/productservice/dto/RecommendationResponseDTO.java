package tn.matchmakers.productservice.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecommendationResponseDTO {
    private String id;
    private double score;
    private String reason;
    private String name;
    private String sport;
    private String type;
    private String imageUrl;
    private double price;
    private double rentalPricePerHour;
    private double averageRating;
    private int totalReviews;
}