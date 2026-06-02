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
        
        // Nettoie le markdown et les blocs de code
        String cleaned = aiResponse
                .replaceAll("(?s)```json\\s*", "")
                .replaceAll("```", "")
                .replaceAll("(?m)^//.*$", "") // retire les commentaires JS-style
                .trim();
        
        // Extrait le JSON entre la première { et sa dernière } correspondante
        int firstBrace = cleaned.indexOf('{');
        if (firstBrace < 0) {
            log.error("No JSON object found in response: {}", cleaned);
            throw new RuntimeException("AI response does not contain valid JSON");
        }
        
        // Trouve la dernière accolade fermante qui correspond (JSON balancé)
        int depth = 0;
        int lastBrace = -1;
        for (int i = firstBrace; i < cleaned.length(); i++) {
            char c = cleaned.charAt(i);
            if (c == '{') depth++;
            else if (c == '}') {
                depth--;
                if (depth == 0) {
                    lastBrace = i;
                    break;
                }
            }
        }
        
        if (lastBrace <= firstBrace) {
            log.error("Could not find balanced JSON in response: {}", cleaned);
            throw new RuntimeException("AI response does not contain valid balanced JSON");
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
        String sport = safeValue(profile.get("sports")).toLowerCase();
        String level = safeValue(profile.get("level")).toUpperCase();
        
        Map<String, Object> plan = new HashMap<>();
        plan.put("from_llm", false);
        
        List<String> warmup;
        List<Map<String, Object>> exercises = new java.util.ArrayList<>();
        List<String> cooldown;
        String title;
        String focus;
        String nutritionTip;
        
        int sets = 3;
        String reps = "10";
        String rest = "60s";
        
        if (level.contains("BEGINNER") || level.contains("DÉBUTANT")) {
            sets = 3;
            reps = "10";
            rest = "60s";
        } else if (level.contains("ADVANCED") || level.contains("AVANCÉ") || level.contains("PRO")) {
            sets = 4;
            reps = "15";
            rest = "45s";
        } else { // INTERMEDIATE
            sets = 4;
            reps = "12";
            rest = "60s";
        }
        
        if (sport.contains("basket")) {
            title = "Préparation Basketball - Explosivité";
            focus = "Développement de la détente verticale et coordination";
            warmup = List.of("5 min de course légère", "Rotations chevilles et genoux", "Sauts légers sur place");
            exercises.add(Map.of("name", "Squats sautés (Jump Squats)", "tip", "Poussez fort vers le haut à l'extension", "sets", sets, "reps", reps, "rest", rest));
            exercises.add(Map.of("name", "Fentes alternées sautées", "tip", "Gardez le genou aligné avec le pied", "sets", sets, "reps", reps, "rest", rest));
            exercises.add(Map.of("name", "Déplacements latéraux rapides", "tip", "Restez bas sur les appuis", "sets", sets, "reps", "30s", "rest", rest));
            exercises.add(Map.of("name", "Planche dynamique (gainage)", "tip", "Contractez les fessiers et les abdos", "sets", sets, "reps", "45s", "rest", rest));
            cooldown = List.of("Étirement des mollets et quadriceps", "Relâchement des lombaires", "Respiration calme");
            nutritionTip = "Une bonne hydratation avec des électrolytes est clé pour éviter les crampes lors des sauts.";
        } else if (sport.contains("foot") || sport.contains("soccer")) {
            title = "Préparation Football - Appuis & Cardio";
            focus = "Cardio, explosivité linéaire et agilité";
            warmup = List.of("Jogging avec montées de genoux", "Talons-fesses et pas chassés", "Rotations de hanches");
            exercises.add(Map.of("name", "Sprints courts répétés", "tip", "Explosez sur les 5 premiers mètres", "sets", sets, "reps", "5x20m", "rest", "90s"));
            exercises.add(Map.of("name", "Squats explosifs", "tip", "Contrôlez la descente et montez vite", "sets", sets, "reps", reps, "rest", rest));
            exercises.add(Map.of("name", "Fentes avant dynamiques", "tip", "Gardez le buste bien droit", "sets", sets, "reps", reps, "rest", rest));
            exercises.add(Map.of("name", "Burpees", "tip", "Enchaînez sans pause avec une bonne technique", "sets", sets, "reps", "8-12", "rest", rest));
            cooldown = List.of("Étirement des ischios et mollets", "Automassage des cuisses", "Retour au calme");
            nutritionTip = "Privilégiez les glucides complexes 3 heures avant l'entraînement pour maximiser votre endurance.";
        } else if (sport.contains("muscu") || sport.contains("bodybuilding") || sport.contains("force")) {
            title = "Renforcement Musculaire Fonctionnel";
            focus = "Force athlétique et hypertrophie globale";
            warmup = List.of("Rotations articulaires complètes", "Pompes sur les genoux", "Squats à vide");
            exercises.add(Map.of("name", "Pompes classiques", "tip", "Dos bien droit et coudes à 45 degrés", "sets", sets, "reps", reps, "rest", rest));
            exercises.add(Map.of("name", "Squats au poids du corps", "tip", "Descendez jusqu'aux cuisses parallèles au sol", "sets", sets, "reps", reps, "rest", rest));
            exercises.add(Map.of("name", "Dips sur chaise", "tip", "Gardez les coudes serrés vers l'arrière", "sets", sets, "reps", reps, "rest", rest));
            exercises.add(Map.of("name", "Supermans (lombaires)", "tip", "Relevez le buste et les jambes en contrôle", "sets", sets, "reps", reps, "rest", rest));
            cooldown = List.of("Étirement des pectoraux et du dos", "Postures de yoga de récupération", "Respiration diaphragmatique");
            nutritionTip = "Consommez une source de protéines de qualité dans les 2 heures après la séance pour réparer les tissus musculaires.";
        } else if (sport.contains("tennis")) {
            title = "Préparation Tennis - Explosivité Latérale";
            focus = "Explosivité latérale, rotation du buste et endurance";
            warmup = List.of("5 min de corde à sauter", "Rotations des épaules et du buste", "Pas chassés");
            exercises.add(Map.of("name", "Fentes latérales", "tip", "Poussez bien sur la jambe extérieure", "sets", sets, "reps", reps, "rest", rest));
            exercises.add(Map.of("name", "Planche avec rotations du buste", "tip", "Suivez votre main du regard", "sets", sets, "reps", "10/côté", "rest", rest));
            exercises.add(Map.of("name", "Pompes explosives (push-off)", "tip", "Poussez fort pour décoller légèrement les mains", "sets", sets, "reps", "8-10", "rest", rest));
            exercises.add(Map.of("name", "Sauts latéraux (Skater Jumps)", "tip", "Stabilisez bien sur un pied à la réception", "sets", sets, "reps", reps, "rest", rest));
            cooldown = List.of("Étirement des épaules et avant-bras", "Étirement des fessiers", "Relaxation");
            nutritionTip = "Pensez aux collations faciles à digérer comme une banane avant le jeu pour un apport rapide en énergie.";
        } else if (sport.contains("cours") || sport.contains("run") || sport.contains("jog") || sport.contains("athlet")) {
            title = "Renforcement Spécial Course à Pied";
            focus = "Endurance fondamentale et renforcement de la foulée";
            warmup = List.of("10 min de marche rapide à course lente", "Montées de genoux légères", "Talons-fesses doux");
            exercises.add(Map.of("name", "Fentes marchées", "tip", "Faites de grands pas réguliers", "sets", sets, "reps", reps, "rest", rest));
            exercises.add(Map.of("name", "Squats classiques", "tip", "Poussez sur les talons, gardez le dos droit", "sets", sets, "reps", reps, "rest", rest));
            exercises.add(Map.of("name", "Planche abdominale statique", "tip", "Restez bien aligné sans creuser le dos", "sets", sets, "reps", "45s", "rest", rest));
            exercises.add(Map.of("name", "Extensions mollets debout", "tip", "Montez le plus haut possible sur la pointe des pieds", "sets", sets, "reps", reps, "rest", rest));
            cooldown = List.of("Étirement de toute la chaîne postérieure (ischios, mollets)", "Hydratation progressive", "Respiration profonde");
            nutritionTip = "Consommez des glucides complexes après la course pour reconstituer vos réserves de glycogène.";
        } else {
            title = "Entraînement Général Tonification";
            focus = "Condition physique globale et tonicité";
            warmup = List.of("5 min de jumping jacks", "Rotations articulaires complètes", "Mobilité des hanches");
            exercises.add(Map.of("name", "Pompes (sur pieds ou genoux)", "tip", "Gardez le dos bien droit et gainé", "sets", sets, "reps", reps, "rest", rest));
            exercises.add(Map.of("name", "Squats", "tip", "Poussez les fesses vers l'arrière", "sets", sets, "reps", reps, "rest", rest));
            exercises.add(Map.of("name", "Planche abdominale", "tip", "Contractez volontairement les abdos et fessiers", "sets", sets, "reps", "45s", "rest", rest));
            exercises.add(Map.of("name", "Jumping Jacks", "tip", "Restez léger sur la pointe des pieds", "sets", sets, "reps", "30s", "rest", rest));
            cooldown = List.of("Étirements globaux jambes et dos", "Respiration abdominale", "Hydratation");
            nutritionTip = "Une alimentation équilibrée avec un bon apport en protéines et légumes soutient vos efforts.";
        }
        
        plan.put("title", title);
        plan.put("focus", focus);
        plan.put("warmup", warmup);
        plan.put("exercises", exercises);
        plan.put("cooldown", cooldown);
        plan.put("nutritionTip", nutritionTip);
        
        return plan;
    }
}
