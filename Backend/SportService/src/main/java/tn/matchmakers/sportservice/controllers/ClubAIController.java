package tn.matchmakers.sportservice.controllers;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.Map;
import java.util.List;
import java.util.Base64;
import java.nio.charset.StandardCharsets;

import org.springframework.http.ResponseEntity;

@RestController
@RequestMapping("/clubs/api/ai")
@CrossOrigin(origins = "http://localhost:4200")
public class ClubAIController {

    @Value("${gemini.api.key:}")
    private String geminiApiKey;

    private final RestTemplate restTemplate = new RestTemplate();

    @PostMapping("/generate-logo")
    public ResponseEntity<Map<String, String>> generateLogo(@RequestBody Map<String, String> body) {
        String name = body.get("name");
        String description = body.get("description");
        String sports = body.get("sports");

        String prompt = """
            Create a professional SVG logo for a sports club.
            Club name: %s
            Sports: %s
            Description: %s
            
            Return ONLY valid SVG code starting with <svg and ending with </svg>.
            Make it colorful, modern, sport-themed. Include the club name as text.
            No explanation, no markdown, just pure SVG code.
            """.formatted(name, sports, description);

        // Call Gemini API
        String geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" + geminiApiKey;
        
        Map<String, Object> requestBody = Map.of(
            "contents", List.of(Map.of(
                "parts", List.of(Map.of("text", prompt))
            ))
        );

        try {
            @SuppressWarnings("unchecked")
            ResponseEntity<Map<String, Object>> response = restTemplate.postForEntity(geminiUrl, requestBody, (Class<Map<String, Object>>) (Class<?>) Map.class);
            Map<String, Object> bodyResponse = response.getBody();
            if (bodyResponse == null) throw new RuntimeException("Empty response from Gemini");

            // Extract SVG from Gemini response
            List<?> candidates = (List<?>) bodyResponse.get("candidates");
            Map<?, ?> firstCandidate = (Map<?, ?>) candidates.get(0);
            Map<?, ?> content = (Map<?, ?>) firstCandidate.get("content");
            List<?> parts = (List<?>) content.get("parts");
            Map<?, ?> firstPart = (Map<?, ?>) parts.get(0);
            String svgCode = (String) firstPart.get("text");
            
            // Clean SVG (remove markdown if any)
            svgCode = svgCode.replaceAll("```svg", "").replaceAll("```", "").trim();
            
            // Convert to base64 Data URL
            String base64 = Base64.getEncoder().encodeToString(svgCode.getBytes(StandardCharsets.UTF_8));
            String dataUrl = "data:image/svg+xml;base64," + base64;
            
            return ResponseEntity.ok(Map.of("imageUrl", dataUrl));
            
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Failed to generate logo: " + e.getMessage()));
        }
    }
}
