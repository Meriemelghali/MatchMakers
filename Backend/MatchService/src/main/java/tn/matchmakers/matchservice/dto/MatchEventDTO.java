package tn.matchmakers.matchservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import tn.matchmakers.matchservice.enums.EventType;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MatchEventDTO {
    private String id;
    private EventType type;
    private Integer minute;
    private String joueur;
    private String equipe;
    private String description;
    private LocalDateTime createdAt;
}
