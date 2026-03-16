package tn.matchmakers.sportservice.services.clients;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import tn.matchmakers.sportservice.dto.external.TeamDto;

import java.util.Collections;
import java.util.List;

@Component
@Slf4j
public class TeamServiceClient {
    private final WebClient webClient;
    public TeamServiceClient(@Qualifier("teamWebClient") WebClient webClient) {
        this.webClient = webClient;
    }

    public TeamDto getTeamById(String teamId) {
        try {
            return webClient.get()
                    .uri("/api/teams/{id}", teamId)
                    .retrieve()
                    .bodyToMono(TeamDto.class)
                    .block();
        } catch (Exception e) {
            log.error("Erreur appel TeamService pour team {}: {}", teamId, e.getMessage());
            return null;
        }
    }
    public List<TeamDto> getTeamsByIds(List<String> teamIds) {
        if (teamIds == null || teamIds.isEmpty()) return Collections.emptyList();

        // Appels parallèles pour chaque teamId
        return teamIds.stream()
                .map(id -> {
                    try {
                        return webClient.get()
                                .uri("/api/teams/{id}", id)
                                .retrieve()
                                .bodyToMono(TeamDto.class)
                                .block();
                    } catch (Exception e) {
                        log.error("Erreur appel TeamService pour team {}: {}", id, e.getMessage());
                        return null;
                    }
                })
                .filter(t -> t != null)
                .collect(java.util.stream.Collectors.toList());
    }
}