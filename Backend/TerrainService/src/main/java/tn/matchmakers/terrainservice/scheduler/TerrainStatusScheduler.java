package tn.matchmakers.terrainservice.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import tn.matchmakers.terrainservice.entity.Terrain;
import tn.matchmakers.terrainservice.enums.TerrainStatus;
import tn.matchmakers.terrainservice.repository.ReservationRepository;
import tn.matchmakers.terrainservice.repository.TerrainRepository;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class TerrainStatusScheduler {

    private final TerrainRepository terrainRepository;
    private final ReservationRepository reservationRepository;

    @Scheduled(fixedRate = 60000)
    public void mettreAJourStatusTerrains() {
        log.debug("Mise à jour automatique des statuts des terrains...");
        List<Terrain> terrains = terrainRepository.findAll();
        LocalDateTime now = LocalDateTime.now();

        for (Terrain terrain : terrains) {
            if (terrain.getStatut() == TerrainStatus.MAINTENANCE || terrain.getStatut() == TerrainStatus.FERME) {
                continue; // Do not auto-change manually set statuses
            }
            boolean actif = !reservationRepository.findActiveReservations(terrain.getId(), now).isEmpty();
            TerrainStatus nouveauStatut = actif ? TerrainStatus.OCCUPE : TerrainStatus.DISPONIBLE;
            if (terrain.getStatut() != nouveauStatut) {
                terrain.setStatut(nouveauStatut);
                terrain.setUpdatedAt(now);
                terrainRepository.save(terrain);
                log.info("Terrain {} -> {}", terrain.getId(), nouveauStatut);
            }
        }
    }
}
