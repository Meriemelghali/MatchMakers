package tn.matchmakers.socialservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReactionRequestDto {
    @NotBlank(message = "Content is required")
    private String content;

    @NotNull(message = "Post ID is required")
    private String idPost;

    @NotNull(message = "User ID is required")
    private String idUser;
}
