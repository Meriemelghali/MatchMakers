package tn.matchmakers.eventcompetitionservice.entities;

import lombok.*;
import org.springframework.data.mongodb.core.mapping.DBRef;
import org.springframework.data.mongodb.core.mapping.Document;

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
    @DBRef
    @Builder.Default
    private List<String> teamIds = new ArrayList<>();

    // Classement
    @DBRef
    @Builder.Default
    private List<String> matchIds = new ArrayList<>();
}
