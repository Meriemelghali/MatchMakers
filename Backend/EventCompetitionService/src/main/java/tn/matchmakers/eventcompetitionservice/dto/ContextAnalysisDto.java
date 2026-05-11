package tn.matchmakers.eventcompetitionservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContextAnalysisDto {
    private String advice;
    private Boolean requiresTerrain;
    private Boolean requiresSpecialRoute;
}
