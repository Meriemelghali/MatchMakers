package tn.matchmakers.productservice.dto;

import lombok.*;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecommendationRequestDTO {
    private List<ProductScoreDTO> products;
    private String userSport;
    private String excludeId;
    private int topK = 6;
}