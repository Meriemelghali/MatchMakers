package tn.matchmakers.productservice.dto;

import lombok.*;
import java.time.LocalDateTime;

@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class RatingResponseDTO {
    private String        id;
    private String        productId;
    private String        userId;
    private String        userName;
    private int           stars;
    private String        comment;
    private LocalDateTime createdAt;
}