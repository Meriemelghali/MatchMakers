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

@Document(collection = "messages")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Message {

    @Id
    private String idMessage;

    @NotBlank(message = "Content is required")
    private String content;

    private LocalDateTime send_at;

    @DBRef
    @JsonIgnore
    @NotNull(message = "Conversation is required")
    private Conversation conversation;

    @NotNull(message = "User ID is required")
    private String idUser;

    public void onCreate() {
        if (send_at == null) {
            send_at = LocalDateTime.now();
        }
    }
}
