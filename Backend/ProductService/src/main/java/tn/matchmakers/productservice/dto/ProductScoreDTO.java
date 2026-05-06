package tn.matchmakers.productservice.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProductScoreDTO {
    private String id;
    private String name;
    private String sport;
    private String type;
    private double averageRating;
    private int totalReviews;
    private int totalOrders;
}