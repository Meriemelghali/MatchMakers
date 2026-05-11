package tn.matchmakers.sportservice.entities;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.DBRef;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

@Document(collection = "sports")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Sport {
    @Id
    private String id;

    @Indexed(unique = true)
    private String nameSport;

    private Long minPlayers;
    private Long maxPlayers;
    private String color;

    @DBRef
    private List<SportCategory> sportCategories;
}