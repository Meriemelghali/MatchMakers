package tn.matchmakers.socialservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ToxicityResponseDto {
    private boolean is_toxic;
    private Map<String, Double> scores;
    private String verdict;
}
