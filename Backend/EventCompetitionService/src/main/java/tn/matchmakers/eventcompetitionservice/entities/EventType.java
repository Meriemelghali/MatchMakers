package tn.matchmakers.eventcompetitionservice.entities;

import lombok.*;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "event_types")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EventType extends BaseEntity {
    private String typeName;
    private Boolean isCompetition;
    private Boolean requiresTeams;
    private Boolean requiresMatches;
}