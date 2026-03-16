package tn.matchmakers.eventcompetitionservice.dto.external;

import lombok.Data;

@Data
public class SportDto {
    private String id;
    private String nameSport;
    private Long minPlayers;
    private Long maxPlayers;
}
