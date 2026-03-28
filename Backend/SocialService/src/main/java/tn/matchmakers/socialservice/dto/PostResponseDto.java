package tn.matchmakers.socialservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PostResponseDto {
    private String idPost;
    private String content;
    private LocalDateTime postCreated_at;
    private String idUser;
    private Boolean isDeleted;

    /** Commentaires du post (1–n). */
    private List<CommentaireResponseDto> commentaires;

    /** Réactions du post (like, support, angry, …) — 1–n, uniquement liées au post. */
    private List<ReactionResponseDto> reactions;
}
