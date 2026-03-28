package tn.matchmakers.eventcompetitionservice.entities;

import lombok.*;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.DBRef;
import org.springframework.data.mongodb.core.mapping.Document;
import tn.matchmakers.eventcompetitionservice.entities.enums.StatutEvent;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Document(collection = "events")
@Getter
@Setter
@Builder
@ToString(callSuper = true)
@AllArgsConstructor
@NoArgsConstructor
public class Event extends BaseEntity {

    private String name;
    private String descriptionEvent;
    private LocalDate startDate;
    private LocalDate endDate;
    private String location;
    private StatutEvent statutEvent = StatutEvent.PLANNED;
    private String sportId;
    private String clubId;
    private Map<String, String> organizerUserId;

    @DBRef
    private EventType eventType;

    @DBRef
    private Competition competition;

    private String terrainId;

    @Builder.Default
    private List<String> teamIds = new ArrayList<>();
}