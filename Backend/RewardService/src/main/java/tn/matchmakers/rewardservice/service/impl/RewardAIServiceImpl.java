package tn.matchmakers.rewardservice.service.impl;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import tn.matchmakers.rewardservice.dto.RewardAIGenerateRequest;
import tn.matchmakers.rewardservice.dto.RewardAISuggestionDto;
import tn.matchmakers.rewardservice.enums.RewardRarity;
import tn.matchmakers.rewardservice.enums.RewardType;
import tn.matchmakers.rewardservice.service.RewardAIService;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class RewardAIServiceImpl implements RewardAIService {

    private final RestClient.Builder restClientBuilder;

    @Value("${reward.ai.pythonai-base-url:http://127.0.0.1:8001}")
    private String pythonAiBaseUrl;

    @Override
    public List<RewardAISuggestionDto> generateRewards(RewardAIGenerateRequest request) {
        List<RewardAISuggestionDto> suggestions = callPythonAi(request);
        if (suggestions != null && !suggestions.isEmpty()) {
            return suggestions;
        }
        return fallback(request);
    }

    private List<RewardAISuggestionDto> callPythonAi(RewardAIGenerateRequest request) {
        try {
            RestClient client = restClientBuilder.baseUrl(pythonAiBaseUrl).build();
            Map<String, Object> body = Map.of(
                    "eventType", request.getEventType(),
                    "teamCount", request.getTeamCount(),
                    "difficulty", request.getDifficulty()
            );
            RewardsGenerateResponse resp = client.post()
                    .uri("/rewards/generate")
                    .body(body)
                    .retrieve()
                    .body(RewardsGenerateResponse.class);

            if (resp == null || resp.items == null || resp.items.isEmpty()) return null;
            List<RewardAISuggestionDto> out = new ArrayList<>();
            for (RewardsGenerateItem it : resp.items) {
                RewardAISuggestionDto dto = new RewardAISuggestionDto();
                dto.setName(safe(it.name, 120));
                dto.setDescription(safe(it.description, 300));
                dto.setPoints(it.points != null ? Math.max(0, it.points) : 0);
                dto.setType(parseType(it.type));
                dto.setRarity(parseRarity(it.rarity, dto.getPoints()));
                out.add(dto);
            }
            return out;
        } catch (Exception e) {
            return null;
        }
    }

    private List<RewardAISuggestionDto> fallback(RewardAIGenerateRequest request) {
        String base = (request.getEventType() == null ? "Evenement" : request.getEventType()).trim();
        int teamCount = request.getTeamCount() != null ? request.getTeamCount() : 2;
        String difficulty = (request.getDifficulty() == null ? "MEDIUM" : request.getDifficulty()).trim().toUpperCase();
        int mult = difficulty.contains("HARD") ? 3 : (difficulty.contains("EASY") ? 1 : 2);

        List<RewardAISuggestionDto> list = new ArrayList<>();
        list.add(s("Esprit d'equipe – " + base, "Recompense attribuee pour la cohesion et l'entraide pendant l'evenement.", RewardType.BEST_TEAM, RewardRarity.RARE, 30 * mult));
        list.add(s("Progression – " + base, "Distinction pour une progression visible et une attitude positive tout au long du match.", RewardType.CERTIFICATE, RewardRarity.COMMON, 15 * mult));
        list.add(s("MVP apaisé – " + base, "MVP base sur impact global et fair-play, pas seulement les buts.", RewardType.MVP, RewardRarity.EPIC, 45 * mult));
        list.add(s("Defense solide – " + base, "Recompense pour une defense disciplinée et une bonne communication.", RewardType.MEDAL, RewardRarity.RARE, 25 * mult));
        list.add(s("Momentum – " + base, "Trophee pour un retournement calme et une gestion du stress.", RewardType.TROPHY, RewardRarity.EPIC, 40 * mult));
        if (teamCount >= 6) {
            list.add(s("Impact collectif – " + base, "Recompense pour une equipe qui eleve le niveau du groupe.", RewardType.BEST_TEAM, RewardRarity.LEGENDARY, 60 * mult));
        }
        return list;
    }

    private RewardAISuggestionDto s(String name, String desc, RewardType type, RewardRarity rarity, int points) {
        RewardAISuggestionDto dto = new RewardAISuggestionDto();
        dto.setName(name);
        dto.setDescription(desc);
        dto.setType(type);
        dto.setRarity(rarity);
        dto.setPoints(points);
        return dto;
    }

    private RewardType parseType(String raw) {
        if (raw == null) return RewardType.CERTIFICATE;
        try {
            return RewardType.valueOf(raw.trim().toUpperCase());
        } catch (Exception e) {
            return RewardType.CERTIFICATE;
        }
    }

    private RewardRarity parseRarity(String raw, int points) {
        if (raw != null) {
            try {
                return RewardRarity.valueOf(raw.trim().toUpperCase());
            } catch (Exception ignored) {
            }
        }
        if (points >= 120) return RewardRarity.LEGENDARY;
        if (points >= 80) return RewardRarity.EPIC;
        if (points >= 35) return RewardRarity.RARE;
        return RewardRarity.COMMON;
    }

    private String safe(String s, int maxLen) {
        String v = s == null ? "" : s.trim();
        if (v.length() > maxLen) return v.substring(0, maxLen).trim();
        return v;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class RewardsGenerateResponse {
        private List<RewardsGenerateItem> items;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    private static class RewardsGenerateItem {
        private String name;
        private String description;
        private String type;
        private String rarity;
        private Integer points;
    }
}

