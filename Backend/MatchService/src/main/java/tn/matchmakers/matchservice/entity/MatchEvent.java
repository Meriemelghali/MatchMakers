package tn.matchmakers.matchservice.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import tn.matchmakers.matchservice.enums.EventType;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MatchEvent {

    @Builder.Default
    private String id = UUID.randomUUID().toString();

    private EventType type;
    private Integer minute;
    private String joueur;
    private String equipe; // "equipe1" or "equipe2"
    private String description;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
