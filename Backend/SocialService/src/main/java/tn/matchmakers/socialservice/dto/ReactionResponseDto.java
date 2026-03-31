package tn.matchmakers.socialservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReactionResponseDto {
    private String idReaction;
    private String content;
    private LocalDateTime postCreated_at;
    private String idUser;
    private String idPost;
}
