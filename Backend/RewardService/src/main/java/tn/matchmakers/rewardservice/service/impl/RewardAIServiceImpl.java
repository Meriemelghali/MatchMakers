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

    /**
     * Builder Spring pour {@link RestClient}.
     * On l'utilise pour construire un client HTTP vers le micro-service PythonAI.
     */
    private final RestClient.Builder restClientBuilder;

    /**
     * Base URL du service PythonAI (FastAPI).
     * - configurable via la propriété: {@code reward.ai.pythonai-base-url}
     * - défaut: {@code http://127.0.0.1:8001}
     */
    @Value("${reward.ai.pythonai-base-url:http://127.0.0.1:8001}")
    private String pythonAiBaseUrl;

    /**
     * Génère une liste de suggestions de récompenses.
     *
     * <p>Flow:</p>
     * <ol>
     *   <li>Appeler PythonAI {@code POST /rewards/generate}</li>
     *   <li>Si vide/erreur → fallback déterministe (sans IA)</li>
     * </ol>
     */
    @Override
    public List<RewardAISuggestionDto> generateRewards(RewardAIGenerateRequest request) {
        // 1) Tentative via IA (PythonAI).
        List<RewardAISuggestionDto> suggestions = callPythonAi(request);

        // 2) Si l'IA renvoie quelque chose, on renvoie tel quel.
        if (suggestions != null && !suggestions.isEmpty()) {
            return suggestions;
        }

        // 3) Sinon : fallback local, pour garder l'app utilisable.
        return fallback(request);
    }

    private List<RewardAISuggestionDto> callPythonAi(RewardAIGenerateRequest request) {
        try {
            // Client HTTP pointant sur PythonAI (baseUrl configurable via properties).
            RestClient client = restClientBuilder.baseUrl(pythonAiBaseUrl).build();

            // Corps JSON attendu par PythonAI.
            Map<String, Object> body = Map.of(
                    "eventType", request.getEventType(),
                    "teamCount", request.getTeamCount(),
                    "difficulty", request.getDifficulty()
            );

            // Appel : POST /rewards/generate → mapping JSON → RewardsGenerateResponse.
            RewardsGenerateResponse resp = client.post()
                    .uri("/rewards/generate")
                    .body(body)
                    .retrieve()
                    .body(RewardsGenerateResponse.class);

            // Réponse absente ou vide → on considère l'IA indisponible/inefficace.
            if (resp == null || resp.items == null || resp.items.isEmpty()) return null;

            // Transformation des items IA → DTOs (avec garde-fous).
            List<RewardAISuggestionDto> out = new ArrayList<>();
            for (RewardsGenerateItem it : resp.items) {
                RewardAISuggestionDto dto = new RewardAISuggestionDto();
                // Nettoyage longueur texte (évite strings trop longues côté UI).
                dto.setName(safe(it.name, 120));
                dto.setDescription(safe(it.description, 300));
                // Points : clamp à >= 0 (sinon 0).
                dto.setPoints(it.points != null ? Math.max(0, it.points) : 0);
                // Type : parse robuste (invalide → CERTIFICATE).
                dto.setType(parseType(it.type));
                // Rarity : parse robuste (invalide → déduite des points).
                dto.setRarity(parseRarity(it.rarity, dto.getPoints()));
                out.add(dto);
            }
            return out;
        } catch (Exception e) {
            // En cas d'erreur (HTTP down, parsing, etc.) → null pour déclencher fallback().
            return null;
        }
    }

    private List<RewardAISuggestionDto> fallback(RewardAIGenerateRequest request) {
        // eventType: libelle utilise dans les noms des suggestions.
        String base = (request.getEventType() == null ? "Evenement" : request.getEventType()).trim();
        // teamCount: si beaucoup d'equipes, on peut ajouter une suggestion "collective".
        int teamCount = request.getTeamCount() != null ? request.getTeamCount() : 2;
        // difficulty: string libre, on detecte EASY/HARD pour ajuster les points.
        String difficulty = (request.getDifficulty() == null ? "MEDIUM" : request.getDifficulty()).trim().toUpperCase();
        // mult: multiplicateur de points selon difficulte.
        int mult = difficulty.contains("HARD") ? 3 : (difficulty.contains("EASY") ? 1 : 2);

        // Liste deterministe (aucune dependance IA) pour garder l'UI utilisable.
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
        // Helper pour construire un DTO de suggestion.
        RewardAISuggestionDto dto = new RewardAISuggestionDto();
        dto.setName(name);
        dto.setDescription(desc);
        dto.setType(type);
        dto.setRarity(rarity);
        dto.setPoints(points);
        return dto;
    }

    private RewardType parseType(String raw) {
        // Type absent ou invalide -> fallback CERTIFICATE.
        if (raw == null) return RewardType.CERTIFICATE;
        try {
            return RewardType.valueOf(raw.trim().toUpperCase());
        } catch (Exception e) {
            return RewardType.CERTIFICATE;
        }
    }

    private RewardRarity parseRarity(String raw, int points) {
        // 1) Si l'IA renvoie une rarity connue, on la prend.
        if (raw != null) {
            try {
                return RewardRarity.valueOf(raw.trim().toUpperCase());
            } catch (Exception ignored) {
            }
        }
        // 2) Sinon, on la deduit des points.
        if (points >= 120) return RewardRarity.LEGENDARY;
        if (points >= 80) return RewardRarity.EPIC;
        if (points >= 35) return RewardRarity.RARE;
        return RewardRarity.COMMON;
    }

    private String safe(String s, int maxLen) {
        // Null -> "", trim, puis clamp maxLen.
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

