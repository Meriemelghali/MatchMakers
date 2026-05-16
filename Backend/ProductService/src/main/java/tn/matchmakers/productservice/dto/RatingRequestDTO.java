package tn.matchmakers.productservice.dto;

import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class RatingRequestDTO {
    private String productId;
    private String userId;
    private String userName;
    private int    stars;      // 1-5
    private String comment;
}