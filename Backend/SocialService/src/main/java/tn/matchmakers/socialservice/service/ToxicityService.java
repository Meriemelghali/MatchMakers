package tn.matchmakers.socialservice.service;

import tn.matchmakers.socialservice.dto.ToxicityRequestDto;
import tn.matchmakers.socialservice.dto.ToxicityResponseDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
@RequiredArgsConstructor
@Slf4j
public class ToxicityService {

    private final RestTemplate restTemplate;

    @Value("${toxicity.service.url:http://localhost:8001/analyze}")
    private String toxicityServiceUrl;

    public void checkToxicity(String text) {
        if (text == null || text.isBlank()) return;
        
        try {
            ToxicityRequestDto request = new ToxicityRequestDto(text);
            ToxicityResponseDto response = restTemplate.postForObject(toxicityServiceUrl, request, ToxicityResponseDto.class);
            
            if (response != null && response.is_toxic()) {
                log.warn("Toxicity detected in content: verdict={}", response.getVerdict());
                throw new RuntimeException("Toxicity detected! Your content contains elements marked as " + response.getVerdict());
            }
        } catch (Exception e) {
            if (e instanceof RuntimeException && e.getMessage().contains("Toxicity detected")) {
                throw e;
            }
            log.error("Error calling toxicity service: {}", e.getMessage());
            // Fail open: allow the content if the toxicity service is unreachable
        }
    }
}
