package tn.matchmakers.eventcompetitionservice.entities;

import lombok.*;
import org.springframework.data.mongodb.core.mapping.Document;
import tn.matchmakers.eventcompetitionservice.entities.enums.CompetitionFormat;
import tn.matchmakers.eventcompetitionservice.entities.enums.CompetitionStatus;

import java.util.ArrayList;
import java.util.List;

@Document(collection = "competitions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Competition extends BaseEntity {
    private String nameCompetition;
    private Long maxTeam;

    // Équipes participantes
    @Builder.Default
    private List<String> teamIds = new ArrayList<>();

    // Classement
    @Builder.Default
    private List<String> matchIds = new ArrayList<>();

    private CompetitionFormat format;
    private CompetitionStatus status;

}
