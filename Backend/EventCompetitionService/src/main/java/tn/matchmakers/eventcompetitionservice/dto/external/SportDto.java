package tn.matchmakers.eventcompetitionservice.dto.external;

import lombok.Data;

import java.util.List;

@Data
public class SportDto {
    private String id;
    private String nameSport;
    private Long minPlayers;
    private Long maxPlayers;
    private List<SportCategoryDTO> sportCategories;
}
