package tn.matchmakers.productservice.entity;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;

@Document(collection = "ratings")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Rating {
    @Id
    private String id;
    private String productId;
    private String userId;
    private String userName;     // prénom + nom affiché
    private int    stars;        // 1 à 5
    private String comment;
    private LocalDateTime createdAt;
}