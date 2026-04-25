package tn.matchmakers.productservice.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScoredProductDTO {
    private String id;
    private double score;
    private String reason;
}