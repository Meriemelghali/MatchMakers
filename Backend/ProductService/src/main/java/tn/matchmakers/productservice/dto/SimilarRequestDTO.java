package tn.matchmakers.productservice.dto;

import lombok.*;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SimilarRequestDTO {
    private ProductScoreDTO targetProduct;
    private List<ProductScoreDTO> candidates;
    private int topK = 4;
}