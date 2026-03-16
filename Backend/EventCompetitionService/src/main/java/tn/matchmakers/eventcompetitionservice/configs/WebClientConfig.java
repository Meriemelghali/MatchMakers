package tn.matchmakers.eventcompetitionservice.configs;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

@Configuration
public class WebClientConfig {

    @Value("${services.sport-service.url:http://localhost:8084}")
    private String sportServiceUrl;

    // MatchService (Ousema — 8087)
    @Value("${services.match-service.url:http://localhost:8087}")
    private String matchServiceUrl;

    @Value("${services.rank-team-service.url:http://localhost:8084}")
    private String rankTeamServiceUrl;

    @Bean("matchWebClient")
    public WebClient matchWebClient() {
        return WebClient.builder()
                .baseUrl(matchServiceUrl)
                .defaultHeader("Content-Type", "application/json")
                .build();
    }
    @Bean("rankTeamWebClient")
    public WebClient rankTeamWebClient() {
        return WebClient.builder()
                .baseUrl(rankTeamServiceUrl)
                .defaultHeader("Content-Type", "application/json")
                .build();
    }
    @Bean("sportWebClient")
    public WebClient sportWebClient() {
        return WebClient.builder()
                .baseUrl(sportServiceUrl)
                .defaultHeader("Content-Type", "application/json")
                .build();
    }
}