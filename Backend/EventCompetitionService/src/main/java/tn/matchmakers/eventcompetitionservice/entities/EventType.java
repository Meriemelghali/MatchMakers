package tn.matchmakers.eventcompetitionservice.entities;

import lombok.*;
import org.springframework.data.mongodb.core.mapping.Document;
import java.util.List;

@Document(collection = "event_types")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EventType extends BaseEntity {
    private String typeName;
    private String icon;
    private String description;
    private List<String> defaultRules;
    private Boolean isCompetition;
    private Boolean requiresTeams;
    private Boolean requiresMatches;
}