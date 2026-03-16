package tn.matchmakers.userservice.entities;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "permissions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Permission {
    @Id
    private String id;

    @Indexed(unique = true)
    private String name; // ex: "USER_READ", "EVENT_CREATE", "SPONSOR_MANAGE"

    private String description;
}
