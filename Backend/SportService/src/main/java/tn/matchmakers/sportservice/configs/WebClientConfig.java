package tn.matchmakers.sportservice.configs;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class WebClientConfig {
    // TeamService (Sami — 8085)
    @Value("${services.team-service.url:http://localhost:8085}")

    private String teamServiceUrl;

    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }

    @Bean("teamWebClient")
    public WebClient teamWebClient() {
        return WebClient.builder()
                .baseUrl(teamServiceUrl)
                .defaultHeader("Content-Type", "application/json")
                .build();
    }
}
