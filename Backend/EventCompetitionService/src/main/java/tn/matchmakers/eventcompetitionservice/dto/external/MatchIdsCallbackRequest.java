package tn.matchmakers.eventcompetitionservice.dto.external;

import lombok.Data;

import java.util.List;

@Data
public class MatchIdsCallbackRequest {
    private String competitionId;
    private List<String> matchIds;
}
