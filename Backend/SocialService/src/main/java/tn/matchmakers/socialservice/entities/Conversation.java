package tn.matchmakers.socialservice.entities;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

@Document(collection = "conversations")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Conversation {

    @Id
    private String idConversation;

    @NotNull(message = "Conversation type is required")
    private ConType conversationT;

    private List<Long> userIds;

    /**
     * Messages liés via {@link Message#conversation} (enfant → parent). Chargés via requête pour les DTO.
     */
}
