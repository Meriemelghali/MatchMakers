package tn.matchmakers.socialservice.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import tn.matchmakers.socialservice.entities.ConType;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ConversationRequestDto {
    @NotNull(message = "Conversation type is required")
    private ConType conversationT;

    private List<String> userIds;
}
