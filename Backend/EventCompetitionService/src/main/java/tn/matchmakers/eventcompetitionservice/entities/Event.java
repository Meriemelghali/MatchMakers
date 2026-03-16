package tn.matchmakers.eventcompetitionservice.entities;

import lombok.*;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.DBRef;
import org.springframework.data.mongodb.core.mapping.Document;
import tn.matchmakers.eventcompetitionservice.entities.enums.StatutEvent;

import java.time.LocalDate;
import java.util.Map;

@Document(collection = "events")
@Getter
@Setter
@ToString(callSuper = true)
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

    @DBRef
    private EventType eventType;

    @DBRef
    private Competition competition;

    private Map<String, String> organizerUserId;
}