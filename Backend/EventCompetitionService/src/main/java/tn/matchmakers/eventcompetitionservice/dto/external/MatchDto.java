package tn.matchmakers.eventcompetitionservice.dto.external;

import lombok.Data;

import java.util.Date;

@Data
public class MatchDto {
    private String id;
    private Date matchDateTime;
    private String statutM;
    private String teamAId;
    private String teamBId;
    private String competitionId;
    private String terrainId;
    private String eventId;
    private String type;
}