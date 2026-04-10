package tn.matchmakers.eventcompetitionservice.services;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.HttpMethod;
import org.springframework.core.ParameterizedTypeReference;
import tn.matchmakers.eventcompetitionservice.dto.AISuggestionDto;
import tn.matchmakers.eventcompetitionservice.entities.EventType;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import tn.matchmakers.eventcompetitionservice.dto.ContextAnalysisDto;
import java.util.Map;

@Service
public class EventAIService {

    private final RestTemplate restTemplate = new RestTemplate();
    private final String AI_SERVICE_URL = "http://localhost:8002/api/ai";


    /**
     * Suggests a full configuration for a new event type based on name.
     */
    public Map<String, Object> suggestNewTypeConfig(String typeName) {
        try {
            String url = AI_SERVICE_URL + "/suggest-type-config";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            Map<String, String> requestBody = new HashMap<>();
            requestBody.put("typeName", typeName);
            
            HttpEntity<Map<String, String>> request = new HttpEntity<>(requestBody, headers);
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
            System.err.println("Error calling AI Service: " + e.getMessage());
        }
        
        // Fallback locally
        Map<String, Object> proposal = new HashMap<>();
        String name = typeName != null ? typeName.toLowerCase() : "";
        proposal.put("typeName", typeName);
        proposal.put("icon", "✨");
        proposal.put("description", "Format d'événement standard optimisé pour l'engagement.");
        proposal.put("isCompetition", name.contains("tournoi") || name.contains("tournament"));
        proposal.put("requiresTeams", !name.contains("indiv") && !name.contains("solo"));
        proposal.put("requiresMatches", true);
        return proposal;
    }

    /**
     * Innovates an existing event type with better descriptions and rules.
     */
    public Map<String, Object> innovateTypeConfig(EventType current) {
        if (current == null) return new HashMap<>();
        
        try {
            String url = AI_SERVICE_URL + "/innovate-type-config";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            Map<String, Object> currentTypeMap = new HashMap<>();
            currentTypeMap.put("id", current.getId());
            currentTypeMap.put("typeName", current.getTypeName());
            currentTypeMap.put("description", current.getDescription());
            currentTypeMap.put("isCompetition", current.getIsCompetition());
            currentTypeMap.put("requiresTeams", current.getRequiresTeams());
            currentTypeMap.put("requiresMatches", current.getRequiresMatches());
            currentTypeMap.put("icon", current.getIcon());
            
            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("currentType", currentTypeMap);
            
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
            System.err.println("Error calling AI Service: " + e.getMessage());
        }
        
        // Fallback locally
        Map<String, Object> innovation = new HashMap<>();
        innovation.put("id", current.getId());
        innovation.put("typeName", current.getTypeName());
        
        String desc = current.getDescription() != null ? current.getDescription() : "";
        innovation.put("description", "Évolution 'Elite' ✨ : " + desc + " - Ce format a été optimisé par l'IA.");
        innovation.put("defaultRules", Arrays.asList("Points d'expérience doublés", "Bonus Fair-play"));
        
        return innovation;
    }

    public List<String> suggestNames(String sport, String type) {
        try {
            String url = AI_SERVICE_URL + "/suggest-names";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            Map<String, String> requestBody = new HashMap<>();
            requestBody.put("sport", sport);
            requestBody.put("type", type);
            
            HttpEntity<Map<String, String>> request = new HttpEntity<>(requestBody, headers);
            ResponseEntity<List<String>> response = restTemplate.exchange(
                url,
                HttpMethod.POST,
                request,
                new ParameterizedTypeReference<List<String>>() {}
            );
            
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return response.getBody();
            }
        } catch (Exception e) {
            System.err.println("Error calling AI Service for names: " + e.getMessage());
        }
        return Arrays.asList(sport + " Open", sport + " Masters", "The " + sport + " " + type);
    }

    public String suggestDescription(String sport, String type) {
        try {
            String url = AI_SERVICE_URL + "/suggest-description";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            Map<String, String> requestBody = new HashMap<>();
            requestBody.put("sport", sport);
            requestBody.put("type", type);
            
            HttpEntity<Map<String, String>> request = new HttpEntity<>(requestBody, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(url, request, String.class);
            
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return response.getBody();
            }
        } catch (Exception e) {
            System.err.println("Error calling AI Service for description: " + e.getMessage());
        }
        return "Rejoignez-nous pour cet événement de " + sport + " (" + type + ") !";
    }

    public ContextAnalysisDto analyzeContext(String sport, String eventType) {
        try {
            String url = AI_SERVICE_URL + "/analyze-context";
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            Map<String, String> requestBody = new HashMap<>();
            requestBody.put("sport", sport);
            requestBody.put("eventType", eventType);
            
            HttpEntity<Map<String, String>> request = new HttpEntity<>(requestBody, headers);
            ResponseEntity<ContextAnalysisDto> response = restTemplate.postForEntity(url, request, ContextAnalysisDto.class);
            
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return response.getBody();
            }
        } catch (Exception e) {
            System.err.println("Error calling AI Service for context analysis: " + e.getMessage());
        }
        // Fallback: detect route-based individual sports locally
        String sportUpper = sport != null ? sport.toUpperCase() : "";
        boolean isRouteSport = List.of("CYCLING", "RUNNING", "ATHLETICS", "SWIMMING", "TRIATHLON").contains(sportUpper);
        String fallbackAdvice = isRouteSport
                ? String.format("Le %s nécessite un parcours ou une piste spécifique plutôt qu'un terrain classique. Précisez le lieu du parcours.", sport)
                : String.format("Pensez à bien définir le lieu pour votre événement de %s.", sport);
        return ContextAnalysisDto.builder()
                .advice(fallbackAdvice)
                .requiresTerrain(!isRouteSport)
                .requiresSpecialRoute(isRouteSport)
                .build();
    }

    public AISuggestionDto suggestConfiguration(String sport, boolean isCompetition) {
        String s = sport.toUpperCase();
        String recommendedType = List.of("FOOTBALL", "BASKETBALL", "TENNIS", "VOLLEYBALL").contains(s) 
                ? "COMPETITION" : "SIMPLE";

        // Logic check for individual sports
        boolean isIndividual = List.of("CYCLING", "RUNNING", "ATHLETICS", "SWIMMING").contains(s);

        AISuggestionDto.AISuggestionDtoBuilder builder = AISuggestionDto.builder()
                .recommendedType(recommendedType)
                .successProbability(isIndividual ? 92 : 88);

        if (isCompetition) {
            builder.maxTeams(8)
                   .format("KNOCKOUT")
                   .durationDays(2)
                   .rules(Arrays.asList("Fair-play obligatoire", "Arbitrage certifié"))
                   .reasoning(String.format("Pour une compétition de %s, un format Knockout avec 8 équipes est idéal pour maintenir l'intensité sur 2 jours.", sport));
        } else {
            builder.maxTeams(isIndividual ? 0 : 2)
                   .format(isIndividual ? "INDIVIDUAL_SESSION" : "FRIENDLY")
                   .durationDays(1)
                   .rules(isIndividual 
                           ? Arrays.asList("Briefing sécurité", "Parcours fléché") 
                           : Arrays.asList("Match amical", "Rotation libre"))
                   .reasoning(isIndividual 
                           ? String.format("Le %s est un sport individuel. Une session organisée réussit mieux sans la notion d'équipes.", sport)
                           : String.format("Les matchs amicaux de %s réussissent mieux avec une organisation simple sur une seule journée.", sport));
        }

        // Magic Flow: New Type Proposal
        if (isIndividual) {
            builder.newTypeProposal(EventType.builder()
                    .typeName(sport + " Session")
                    .icon(getIconForSport(s))
                    .description(String.format("Session individuelle ou collective de %s sans opposition directe.", sport))
                    .isCompetition(false)
                    .requiresTeams(false)
                    .requiresMatches(false)
                    .build());
        }

        return builder.build();
    }

    private String getIconForSport(String sport) {
        Map<String, String> icons = new HashMap<>();
        icons.put("CYCLING", "🚴");
        icons.put("RUNNING", "🏃");
        icons.put("SWIMMING", "🏊");
        icons.put("ATHLETICS", "🥇");
        return icons.getOrDefault(sport, "📍");
    }
}
