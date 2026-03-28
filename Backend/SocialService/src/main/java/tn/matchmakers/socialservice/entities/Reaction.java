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

@Document(collection = "reactions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Reaction {

    @Id
    private String idReaction;

    @NotBlank(message = "Content is required")
    private String content;

    private LocalDateTime postCreated_at;

    /**
     * Réaction (like, support, angry, …) uniquement liée au post — pas de lien avec {@link Commentaire}.
     */
    @DBRef
    @JsonIgnore
    @NotNull(message = "Post is required")
    private Post post;

    @NotNull(message = "User ID is required")
    private String idUser;

    public void onCreate() {
        if (postCreated_at == null) {
            postCreated_at = LocalDateTime.now();
        }
    }
}
