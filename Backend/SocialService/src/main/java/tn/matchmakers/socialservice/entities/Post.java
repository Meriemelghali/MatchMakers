package tn.matchmakers.socialservice.entities;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "posts")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Post {

    @Id
    private String idPost;

    @NotBlank(message = "Content is required")
    private String content;

    private LocalDateTime postCreated_at;

    @NotNull(message = "User ID is required")
    private String idUser;

    @Builder.Default
    private Boolean isDeleted = false;

    /**
     * Les commentaires et réactions sont liés par {@code Commentaire.post} et {@code Reaction.post}
     * (relation enfant → parent). Les listes agrégées sont exposées via les DTO / requêtes.
     */

    public void onCreate() {
        if (postCreated_at == null) {
            postCreated_at = LocalDateTime.now();
        }
    }
}
