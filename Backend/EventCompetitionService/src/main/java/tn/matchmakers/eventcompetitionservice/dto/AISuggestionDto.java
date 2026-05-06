package tn.matchmakers.eventcompetitionservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import tn.matchmakers.eventcompetitionservice.entities.EventType;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AISuggestionDto {
    private Integer maxTeams;
    private String format;
    private Integer durationDays;
    private List<String> rules;
    private Integer successProbability;
    private String reasoning;
    private String recommendedType; // "COMPETITION" or "SIMPLE"
    private EventType newTypeProposal;
}
