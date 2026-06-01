package tn.matchmakers.userservice.services;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.fasterxml.jackson.databind.ObjectMapper;

import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.HttpMethod;
import org.springframework.core.ParameterizedTypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserAIService {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate = new RestTemplate();
    private final String AI_SERVICE_URL = "http://127.0.0.1:8001/api/ai";

    @Value("${openrouter.api.key}")
    private String apiKey;

    @Value("${openrouter.api.url}")
    private String apiUrl;

    @Value("${openrouter.api.model}")
    private String model;

    public Map<String, Object> getSportQuote(List<String> favoriteSports) {
        try {
            String url = AI_SERVICE_URL + "/sport-quote";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("sports", favoriteSports);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    request,
                    new ParameterizedTypeReference<Map<String, Object>>() {
                    });

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return response.getBody();
            }
        } catch (Exception e) {
            System.err.println("Error calling AI Service for sport quote: " + e.getMessage());
        }
        Map<String, Object> fallback = new HashMap<>();
        fallback.put("quote", "Le sport est le dépassement de soi. Restez passionné !");
        fallback.put("from_llm", false);
        return fallback;
    }
    public Map<String, Object> generateClubLogo(String name, String description, List<String> sports) {
        try {
            String url = AI_SERVICE_URL + "/generate-logo";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("name", name);
            requestBody.put("description", description);
            requestBody.put("sports", sports);

            HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    request,
                    new ParameterizedTypeReference<Map<String, Object>>() {
                    });

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return response.getBody();
            }
        } catch (Exception e) {
            log.error("Error generating club logo: {}", e.getMessage());
        }
        return null;
    }

    /**
     * Génère le plan d'entraînement du jour personnalisé selon le profil
     */
    public Map<String, Object> getTodayTrainingPlan(Map<String, Object> profile) {
        log.info("=== PROFILE RECEIVED: {} ===", profile);
        String systemPrompt = buildPlanSystemPrompt();
        String userPrompt = buildPlanUserPrompt(profile);

        try {
            String aiResponse = callOpenRouter(systemPrompt, userPrompt, 1500);
            Map<String, Object> plan = parseJsonResponse(aiResponse);
            plan.put("from_llm", true);
            return plan;
        } catch (Exception e) {
            log.error("=== ERROR DETAILS === Type: {} | Message: {}", e.getClass().getName(), e.getMessage());
            log.error("Stack trace:", e);
            return getFallbackPlan(profile);
        }
    }

    /**
     * Chatbot : répond aux questions ET modifie le plan si nécessaire
     */
    public Map<String, Object> askCoachAssistant(String userId, String message, Map<String, Object> context) {
        String systemPrompt = buildChatSystemPrompt();
        String userPrompt = buildChatUserPrompt(message, context);

        try {
            String aiResponse = callOpenRouter(systemPrompt, userPrompt, 1500);
            Map<String, Object> result = parseJsonResponse(aiResponse);

            // Si l'IA a modifié le plan, on flag avec from_llm
            if (result.get("updatedPlan") != null) {
                @SuppressWarnings("unchecked")
                Map<String, Object> updatedPlan = (Map<String, Object>) result.get("updatedPlan");
                updatedPlan.put("from_llm", true);
            }
            return result;
        } catch (Exception e) {
            log.error("=== CHAT ERROR === Type: {} | Message: {}", e.getClass().getName(), e.getMessage());
            log.error("Stack trace:", e);
            Map<String, Object> fallback = new HashMap<>();
            fallback.put("reply", "Désolé, je n'ai pas pu traiter votre demande. Pouvez-vous reformuler ?");
            fallback.put("updatedPlan", null);
            return fallback;
        }
    }

    // ============== APPEL API OPENROUTER ==============

    private String callOpenRouter(String systemPrompt, String userPrompt, int maxTokens) {
        WebClient webClient = WebClient.builder()
                .baseUrl(apiUrl)
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + apiKey)
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .defaultHeader("HTTP-Referer", "https://matchmakers.tn")
                .defaultHeader("X-Title", "MatchMakers Coach")
                .build();

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("model", model);
        requestBody.put("max_tokens", maxTokens);
        requestBody.put("messages", List.of(
                Map.of("role", "system", "content", systemPrompt),
                Map.of("role", "user", "content", userPrompt)
        ));
        // PAS de response_format - cause des erreurs avec certains modèles gratuits

        log.info("=== CALLING OPENROUTER === Model: {}, URL: {}", model, apiUrl);

        try {
            JsonNode response = webClient.post()
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();

            log.info("=== OPENROUTER FULL RESPONSE === {}", response);

            if (response == null) {
                throw new RuntimeException("Null response from OpenRouter");
            }

            // Vérifier s'il y a une erreur dans la réponse
            if (response.has("error")) {
                String errorMsg = response.get("error").toString();
                log.error("=== OPENROUTER ERROR IN BODY === {}", errorMsg);
                throw new RuntimeException("OpenRouter error: " + errorMsg);
            }

            if (!response.has("choices") || response.get("choices").size() == 0) {
                log.error("=== NO CHOICES IN RESPONSE === {}", response);
                throw new RuntimeException("No choices returned by OpenRouter");
            }

            JsonNode firstChoice = response.get("choices").get(0);
            if (!firstChoice.has("message") || !firstChoice.get("message").has("content")) {
                log.error("=== NO MESSAGE/CONTENT IN CHOICE === {}", firstChoice);
                throw new RuntimeException("No content in OpenRouter response");
            }

            String content = firstChoice.get("message").get("content").asText();
            log.info("=== EXTRACTED CONTENT (length={}) === {}", content.length(), content);
            
            return content;
        } catch (Exception e) {
            log.error("=== OPENROUTER CALL FAILED === Type: {} | Message: {}", 
                    e.getClass().getName(), e.getMessage());
            throw new RuntimeException("AI service unavailable: " + e.getMessage(), e);
        }
    }

    // ============== PROMPTS ==============

    private String buildPlanSystemPrompt() {
        return """
                Tu es un coach sportif diplômé et expert en préparation physique.
                Tu crées des plans d'entraînement précis, professionnels et personnalisés en français impeccable (sans fautes).

                Tu DOIS répondre UNIQUEMENT en JSON valide, sans markdown, sans backticks, sans texte avant ou après.

                Format STRICT :
                {
                "title": "Titre spécifique au sport et à l'objectif (ex: 'Préparation Basketball - Explosivité Débutant')",
                "focus": "Objectif détaillé (ex: 'Développement de la détente verticale et coordination')",
                "warmup": ["échauffement 1 spécifique au sport", "échauffement 2", "mobilité ciblée"],
                "exercises": [
                    {
                    "name": "Nom précis de l'exercice (ex: 'Squat sauté avec contre-mouvement')",
                    "tip": "Conseil technique en une phrase",
                    "sets": 4,
                    "reps": "8-10",
                    "rest": "60s"
                    }
                ],
                "cooldown": ["étirement ciblé 1", "étirement ciblé 2", "respiration"],
                "nutritionTip": "Conseil nutrition spécifique au sport et à l'objectif"
                }

                Règles strictes :
                - Adapte PRÉCISÉMENT au sport préféré :
                * Basketball : pliométrie, sauts verticaux, agilité, gainage, travail de cheville
                * Football : cardio, sprints, agilité, force des jambes, équilibre
                * Musculation : force, hypertrophie, exercices composés
                * Tennis : rotation, explosivité latérale, épaule, jeu de jambes
                * Course : endurance, foulée, renforcement chaîne postérieure
                - Adapte l'intensité au niveau :
                * BEGINNER : exercices simples, charges légères, plus de repos (60-90s), 3-4 exercices
                * INTERMEDIATE : 4-5 exercices, repos 45-60s, complexité moyenne
                * ADVANCED : 5-6 exercices, repos courts (30-45s), exercices complexes
                - Adapte au poids/taille pour les conseils nutrition
                - Prends en compte les objectifs (compétition, perte de poids, endurance, etc.)
                - 5 exercices au total
                - 3 étapes d'échauffement spécifiques au sport
                - 3 étapes de récupération
                - Vocabulaire technique correct, français impeccable, AUCUNE faute
                """;
    }

    private String buildPlanUserPrompt(Map<String, Object> profile) {
        return String.format("""
                Génère le plan d'entraînement du jour pour ce profil précis :

                Sport(s) préféré(s) : %s
                Niveau de pratique : %s
                Objectifs : %s
                Poids : %s kg
                Taille : %s cm

                IMPORTANT :
                - Le titre du plan DOIT mentionner le sport préféré
                - Les exercices DOIVENT être spécifiques à ce sport
                - L'échauffement DOIT préparer aux mouvements de ce sport
                - Adapte tout au niveau indiqué
                - Le conseil nutrition doit tenir compte de l'objectif
                """,
                safeValue(profile.get("sports")),
                safeValue(profile.get("level")),
                safeValue(profile.get("goals")),
                safeValue(profile.get("weight")),
                safeValue(profile.get("height")));
    }

    private String buildChatSystemPrompt() {
        return """
                Tu es MatchCoach, un assistant sportif IA conversationnel en français.
                L'utilisateur a un plan d'entraînement actif. Il peut :
                1. Te poser des questions (conseils, explications, nutrition)
                2. Te demander de modifier son plan (remplacer un exercice, ajuster, retirer)

                Tu DOIS répondre UNIQUEMENT en JSON valide, sans markdown, sans backticks.

                Format STRICT :
                {
                  "reply": "Ta réponse conversationnelle courte et amicale",
                  "updatedPlan": null
                }

                OU si modification du plan demandée :
                {
                  "reply": "Confirmation amicale du changement",
                  "updatedPlan": {
                    "title": "...",
                    "focus": "...",
                    "warmup": [...],
                    "exercises": [...],
                    "cooldown": [...],
                    "nutritionTip": "..."
                  }
                }

                Règles :
                - Question/conseil simple → updatedPlan: null
                - "Je ne veux pas faire X" / "Remplace X" / "Je n'ai pas d'équipement Y" → renvoie updatedPlan COMPLET avec la modification
                - Garde la même structure JSON que le plan d'origine
                - Sois bref et naturel dans "reply"
                """;
    }

    private String buildChatUserPrompt(String message, Map<String, Object> context) {
        String contextJson;
        try {
            contextJson = objectMapper.writeValueAsString(context);
        } catch (Exception e) {
            contextJson = "{}";
        }

        return String.format("""
                Plan actuel de l'utilisateur :
                %s

                Message de l'utilisateur : "%s"

                Réponds en JSON selon les règles définies.
                """, contextJson, message);
    }

    // ============== UTILITAIRES ==============

    @SuppressWarnings("unchecked")
    private Map<String, Object> parseJsonResponse(String aiResponse) throws Exception {
        log.info("=== RAW AI RESPONSE === {}", aiResponse);
        
        if (aiResponse == null || aiResponse.isBlank()) {
            throw new RuntimeException("AI returned empty response");
        }
        
        // Nettoie le markdown
        String cleaned = aiResponse
                .replaceAll("```json", "")
                .replaceAll("```", "")
                .trim();
        
        // Extrait juste le JSON entre première { et dernière }
        int firstBrace = cleaned.indexOf('{');
        int lastBrace = cleaned.lastIndexOf('}');
        
        if (firstBrace < 0 || lastBrace <= firstBrace) {
            log.error("No valid JSON found in response: {}", cleaned);
            throw new RuntimeException("AI response does not contain valid JSON");
        }
        
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
        log.info("=== CLEANED JSON === {}", cleaned);
        
        Map<String, Object> result = objectMapper.readValue(cleaned, Map.class);
        
        if (result == null) {
            throw new RuntimeException("JSON parsing returned null");
        }
        
        return result;
    }

    private String safeValue(Object value) {
        if (value == null)
            return "non spécifié";
        if (value instanceof List<?> list) {
            return list.isEmpty() ? "non spécifié" : String.join(", ", list.stream().map(String::valueOf).toList());
        }
        return value.toString();
    }

    private Map<String, Object> getFallbackPlan(Map<String, Object> profile) {
        Map<String, Object> plan = new HashMap<>();
        plan.put("title", "Entraînement Général");
        plan.put("focus", "Condition globale");
        plan.put("from_llm", false);
        plan.put("warmup", List.of("5 min de jumping jacks", "Rotations articulaires", "Mobilité hanches"));
        plan.put("exercises", List.of(
                Map.of("name", "Pompes", "tip", "Gardez le dos bien droit", "sets", 3, "reps", "12", "rest", "45s"),
                Map.of("name", "Squats", "tip", "Poussez sur les talons", "sets", 4, "reps", "15", "rest", "1min"),
                Map.of("name", "Planche", "tip", "Gainez les abdos", "sets", 3, "reps", "30s", "rest", "30s")));
        plan.put("cooldown", List.of("Étirements jambes", "Étirements dos", "Respiration profonde"));
        plan.put("nutritionTip", "Pensez à consommer des protéines après cette séance.");
        return plan;
    }
}
