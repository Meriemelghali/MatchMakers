package tn.matchmakers.terrainservice.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import tn.matchmakers.terrainservice.entity.Reservation;
import tn.matchmakers.terrainservice.enums.ReservationStatus;

import java.time.LocalDateTime;
import java.util.List;

public interface ReservationRepository extends MongoRepository<Reservation, String> {
    List<Reservation> findByTerrainId(String terrainId);

    List<Reservation> findByOrganisateurId(Long organisateurId);

    List<Reservation> findByStatut(ReservationStatus statut);

    @Query("{'terrainId': ?0, 'statut': {$in: ['EN_ATTENTE', 'CONFIRMEE']}, 'dateDebut': {$lt: ?2}, 'dateFin': {$gt: ?1}}")
    List<Reservation> findOverlappingReservations(String terrainId, LocalDateTime debut, LocalDateTime fin);

    @Query("{'terrainId': ?0, 'statut': 'CONFIRMEE', 'dateDebut': {$lte: ?1}, 'dateFin': {$gte: ?1}}")
    List<Reservation> findActiveReservations(String terrainId, LocalDateTime now);
}
