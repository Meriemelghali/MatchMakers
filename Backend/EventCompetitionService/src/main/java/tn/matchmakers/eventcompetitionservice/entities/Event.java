package tn.matchmakers.eventcompetitionservice.entities;

import lombok.*;
import org.springframework.data.mongodb.core.index.Indexed;
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

    @Indexed(unique = true)
    private String name;

    private String description;

    private String location;

    private LocalDate startDate;
    private LocalDate endDate;

    private StatutEvent statutEvent = StatutEvent.PLANNED;

    private Map<String, String> createdBy;

}
