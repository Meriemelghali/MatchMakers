package tn.matchmakers.userservice.services;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.HttpMethod;
import org.springframework.core.ParameterizedTypeReference;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class UserAIService {

    private final RestTemplate restTemplate = new RestTemplate();
    private final String AI_SERVICE_URL = "http://localhost:8001/api/ai";

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
                new ParameterizedTypeReference<Map<String, Object>>() {}
            );
            
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

    public Map<String, Object> getTodayTrainingPlan(Map<String, Object> userProfile) {
        try {
            String url = AI_SERVICE_URL + "/coach/plan";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(userProfile, headers);
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                url, HttpMethod.POST, request, new ParameterizedTypeReference<Map<String, Object>>() {}
            );
            return response.getBody();
        } catch (Exception e) {
            Map<String, Object> fallback = new HashMap<>();
            fallback.put("title", "Session de Remise en Forme");
            fallback.put("focus", "Condition Physique Générale");
            fallback.put("warmup", List.of("5 min de marche rapide", "Rotations articulaires"));
            fallback.put("exercises", List.of(
                Map.of("name", "Pompes", "sets", "3", "reps", "10", "rest", "45s", "tip", "Gardez le dos droit"),
                Map.of("name", "Squats", "sets", "3", "reps", "15", "rest", "60s", "tip", "Poussez sur les talons")
            ));
            fallback.put("cooldown", List.of("Étirements légers des jambes", "Respiration profonde (2 min)"));
            fallback.put("nutritionTip", "Buvez au moins 2L d'eau par jour pour une meilleure récupération.");
            fallback.put("from_llm", false);
            return fallback;
        }
    }

    public Map<String, Object> askCoachAssistant(String userId, String message) {
        try {
            String url = AI_SERVICE_URL + "/coach/chat";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            Map<String, Object> body = Map.of("userId", userId, "message", message);
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                url, HttpMethod.POST, request, new ParameterizedTypeReference<Map<String, Object>>() {}
            );
            return response.getBody();
        } catch (Exception e) {
            return Map.of("reply", "Désolé, je ne peux pas répondre pour le moment.", "from_llm", false);
        }
    }
}
