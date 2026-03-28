package tn.matchmakers.matchservice.service;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import tn.matchmakers.matchservice.dto.AiLeaderboardRequest;
import tn.matchmakers.matchservice.dto.AiLeaderboardResponse;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class OpenAiLeaderboardService {

    private final RestClient restClient = RestClient.builder()
            .baseUrl("https://api.openai.com/v1")
            .build();

    @Value("${openai.api-key:}")
    private String apiKey;

    @Value("${openai.model:gpt-5-mini}")
    private String model;

    public AiLeaderboardResponse answer(AiLeaderboardRequest request) {
        final String prompt = buildPrompt(request);

        if (apiKey == null || apiKey.isBlank()) {
            return new AiLeaderboardResponse(fallback(prompt), false, null);
        }

        try {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("model", model);
            payload.put("input", prompt);
            payload.put("max_output_tokens", 450);

            JsonNode resp = restClient.post()
                    .uri("/responses")
                    .header(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.APPLICATION_JSON)
                    .body(payload)
                    .retrieve()
                    .body(JsonNode.class);

            String text = extractText(resp);
            if (text == null || text.isBlank()) {
                return new AiLeaderboardResponse(fallback(prompt), false, model);
            }

            return new AiLeaderboardResponse(text.trim(), true, model);
        } catch (Exception e) {
            // If OpenAI is unreachable/misconfigured, keep the UI functional.
            return new AiLeaderboardResponse(fallback(prompt), false, model);
        }
    }

    private String buildPrompt(AiLeaderboardRequest req) {
        StringBuilder sb = new StringBuilder();
        sb.append("Tu es un assistant simple pour l'ecran 'Classement' de MatchMakers.\n");
        sb.append("Reponds en francais, en 6-10 lignes max, concret et actionnable.\n");
        sb.append("Si une info manque, dis-le clairement et propose une alternative.\n\n");

        if (req.context() != null && !req.context().isBlank()) {
            sb.append("CONTEXTE (snapshot):\n");
            sb.append(req.context().trim()).append("\n\n");
        }

        sb.append("QUESTION:\n").append(req.question().trim()).append("\n");
        return sb.toString();
    }

    private String extractText(JsonNode resp) {
        if (resp == null) return null;
        JsonNode output = resp.path("output");
        if (!output.isArray() || output.isEmpty()) return null;

        StringBuilder sb = new StringBuilder();
        for (JsonNode item : output) {
            JsonNode content = item.path("content");
            if (!content.isArray()) continue;
            for (JsonNode c : content) {
                if ("output_text".equals(c.path("type").asText())) {
                    String t = c.path("text").asText();
                    if (t != null && !t.isBlank()) {
                        if (!sb.isEmpty()) sb.append("\n");
                        sb.append(t.trim());
                    }
                }
            }
        }
        return sb.toString();
    }

    private String fallback(String prompt) {
        // Deterministic fallback: keep it helpful even without a key.
        return "IA (mode simple): je n'ai pas de cle OPENAI_API_KEY configuree sur le backend.\n"
                + "Je peux quand meme t'aider: utilise les 'AI Insights' et le simulateur dans l'ecran.\n"
                + "Astuce: pose une question courte (ex: 'Pourquoi Team A est #1?' ou 'Donne 3 actions pour Team B').\n"
                + "Horodatage: " + LocalDateTime.now();
    }
}

