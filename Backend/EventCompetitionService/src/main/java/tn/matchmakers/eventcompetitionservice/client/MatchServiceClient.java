package tn.matchmakers.eventcompetitionservice.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import tn.matchmakers.eventcompetitionservice.dto.external.CreateMatchRequest;
import tn.matchmakers.eventcompetitionservice.dto.external.MatchDto;

import java.util.List;

@FeignClient(name = "match-service", url = "${match.service.url}")
public interface MatchServiceClient {
    // Créer un match (Friendly ou compétition)
    @PostMapping("/")
    MatchDto creerMatch(@RequestBody CreateMatchRequest request);

    // Récupérer un match par ID
    @GetMapping("/{id}")
    MatchDto obtenirMatch(@PathVariable("id") String id);

    // Filtrer par terrain
    @GetMapping("/terrain/{terrainId}")
    List<MatchDto> obtenirMatchsParTerrain(@PathVariable("terrainId") String terrainId);
}
