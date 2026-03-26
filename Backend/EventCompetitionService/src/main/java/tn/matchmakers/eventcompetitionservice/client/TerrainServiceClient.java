package tn.matchmakers.eventcompetitionservice.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;
import tn.matchmakers.eventcompetitionservice.dto.external.CreateReservationRequest;
import tn.matchmakers.eventcompetitionservice.dto.external.ReservationDTO;
import tn.matchmakers.eventcompetitionservice.dto.external.TerrainDTO;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@FeignClient(name = "terrain-service", url = "${terrain.service.url}")
public interface TerrainServiceClient {
    // Récupérer un terrain par ID
    @GetMapping("/{id}")
    TerrainDTO obtenirTerrain(@PathVariable("id") String id);

    // Vérifier disponibilité
    @GetMapping("/reservations/disponibilite")
    Map<String, Boolean> verifierDisponibilite(
            @RequestParam("terrainId") String terrainId,
            @RequestParam("debut") LocalDateTime debut,
            @RequestParam("fin") LocalDateTime fin
    );

    // Créer une réservation
    @PostMapping("/reservations")
    ReservationDTO creerReservation(@RequestBody CreateReservationRequest request);

    // Récupérer réservations d'un terrain
    @GetMapping("/reservations/terrain/{terrainId}")
    List<ReservationDTO> obtenirReservationsDuTerrain(
            @PathVariable("terrainId") String terrainId
    );
}
