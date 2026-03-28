package tn.matchmakers.socialservice.dto;

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
public class ConversationResponseDto {
    private String idConversation;
    private ConType conversationT;
    private List<Long> userIds;
    private List<MessageResponseDto> messages;
}
