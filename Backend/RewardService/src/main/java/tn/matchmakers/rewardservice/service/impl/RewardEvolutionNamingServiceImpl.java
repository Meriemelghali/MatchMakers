package tn.matchmakers.rewardservice.service.impl;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import tn.matchmakers.rewardservice.entity.Reward;
import tn.matchmakers.rewardservice.service.RewardEvolutionNamingService;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class RewardEvolutionNamingServiceImpl implements RewardEvolutionNamingService {

    // Builder RestClient Spring pour appeler PythonAI.
    private final RestClient.Builder restClientBuilder;

    @Value("${reward.ai.pythonai-base-url:http://127.0.0.1:8001}")
    private String pythonAiBaseUrl;

    @Override
    public Optional<Reward> suggestEvolvedNaming(Reward reward) {
        try {
            // Client HTTP vers PythonAI (baseUrl configurable).
            RestClient client = restClientBuilder.baseUrl(pythonAiBaseUrl).build();
            Map<String, Object> body = new HashMap<>();
            // Body "souple": on envoie du contexte pour aider l'IA a renommer.
            body.put("goal", "Renommer apres evolution (titre plus 'legendary' si niveau eleve), et raffiner la description.");
            body.put("type", reward.getType() != null ? reward.getType().name() : null);
            body.put("teamName", reward.getTeamName());
            body.put("dateAwarded", reward.getDateAwarded() != null ? reward.getDateAwarded().toString() : null);
            body.put("currentName", reward.getName());
            body.put("currentDescription", reward.getDescription());
            body.put("currentPoints", reward.getPoints());
            body.put("currentRarity", reward.getRarity() != null ? reward.getRarity().name() : null);

            RewardsSuggestResponse resp = client.post()
                    .uri("/rewards/suggest")
                    .body(body)
                    .retrieve()
                    .body(RewardsSuggestResponse.class);

            // Si pas de nom retour IA -> on ne change rien.
            if (resp == null || resp.getName() == null || resp.getName().isBlank()) {
                return Optional.empty();
            }

            // Construit une copie (sans modifier l'original directement) avec les champs renommes.
            Reward copy = Reward.builder()
                    .id(reward.getId())
                    .name(resp.getName())
                    .type(reward.getType())
                    .description(resp.getDescription() != null ? resp.getDescription() : reward.getDescription())
                    .dateAwarded(reward.getDateAwarded())
                    .points(reward.getPoints())
                    .rarity(reward.getRarity())
                    .status(reward.getStatus())
                    .imageUrl(reward.getImageUrl())
                    .awardedBy(resp.getAwardedBy() != null ? resp.getAwardedBy() : reward.getAwardedBy())
                    .revokedReason(reward.getRevokedReason())
                    .userId(reward.getUserId())
                    .username(reward.getUsername())
                    .teamId(reward.getTeamId())
                    .teamName(reward.getTeamName())
                    .eventId(reward.getEventId())
                    .level(reward.getLevel())
                    .progress(reward.getProgress())
                    .maxProgress(reward.getMaxProgress())
                    .evolutive(reward.getEvolutive())
                    .evolutionRules(reward.getEvolutionRules())
                    .createdAt(reward.getCreatedAt())
                    .updatedAt(reward.getUpdatedAt())
                    .build();

            return Optional.of(copy);
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class RewardsSuggestResponse {
        private String name;
        private String description;
        private Integer points;
        private String rarity;
        private String awardedBy;
        private String rationale;
    }
}
