package tn.matchmakers.socialservice.entities;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.DBRef;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "commentaires")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Commentaire {

    @Id
    private String idComment;

    @NotBlank(message = "Content is required")
    private String content;

    private LocalDateTime postCreated_at;

    @DBRef
    @JsonIgnore
    @NotNull(message = "Post is required")
    private Post post;

    @NotNull(message = "User ID is required")
    private String idUser;

    @Builder.Default
    private Boolean isDeleted = false;

    /**
     * Réactions sur ce commentaire : via {@link Reaction#commentaire} (requête séparée).
     */

    public void onCreate() {
        if (postCreated_at == null) {
            postCreated_at = LocalDateTime.now();
        }
    }
}
