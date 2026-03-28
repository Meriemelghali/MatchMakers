package tn.matchmakers.terrainservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;
import tn.matchmakers.terrainservice.config.RabbitMQConfig;
import tn.matchmakers.terrainservice.dto.CreateReservationRequest;
import tn.matchmakers.terrainservice.dto.ReservationDTO;
import tn.matchmakers.terrainservice.entity.Reservation;
import tn.matchmakers.terrainservice.entity.Terrain;
import tn.matchmakers.terrainservice.enums.ReservationStatus;
import tn.matchmakers.terrainservice.repository.ReservationRepository;
import tn.matchmakers.terrainservice.repository.TerrainRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReservationServiceImpl implements ReservationService {

    private final ReservationRepository reservationRepository;
    private final TerrainRepository terrainRepository;
    private final RabbitTemplate rabbitTemplate;

    @Override
    public ReservationDTO creerReservation(CreateReservationRequest req) {
        if (!verifierDisponibilite(req.getTerrainId(), req.getDateDebut(), req.getDateFin())) {
            throw new IllegalStateException("Ce terrain n'est pas disponible pour cette plage horaire");
        }
        Terrain terrain = terrainRepository.findById(req.getTerrainId())
                .orElseThrow(() -> new NoSuchElementException("Terrain introuvable: " + req.getTerrainId()));

        BigDecimal prix = calculerPrix(terrain.getPrixParHeure(), req.getDateDebut(), req.getDateFin());

        Reservation reservation = Reservation.builder()
                .terrainId(req.getTerrainId())
                .organisateurId(req.getOrganisateurId())
                .dateDebut(req.getDateDebut())
                .dateFin(req.getDateFin())
                .prixTotal(prix)
                .notes(req.getNotes())
                .matchId(req.getMatchId())
                .build();
        Reservation saved = reservationRepository.save(reservation);
        publierEvenement("reservation.created", saved);
        return toDTO(saved);
    }

    @Override
    public ReservationDTO obtenirReservation(String id) {
        return toDTO(trouverReservation(id));
    }

    @Override
    public List<ReservationDTO> obtenirToutesLesReservations() {
        return reservationRepository.findAll().stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Override
    public List<ReservationDTO> obtenirReservationsDuTerrain(String terrainId) {
        return reservationRepository.findByTerrainId(terrainId).stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Override
    public ReservationDTO confirmerReservation(String id) {
        Reservation r = trouverReservation(id);
        validerTransition(r.getStatut(), ReservationStatus.CONFIRMEE);
        r.setStatut(ReservationStatus.CONFIRMEE);
        r.setUpdatedAt(LocalDateTime.now());
        Reservation saved = reservationRepository.save(r);
        publierEvenement("reservation.reserved", saved);
        return toDTO(saved);
    }

    @Override
    public ReservationDTO annulerReservation(String id) {
        Reservation r = trouverReservation(id);
        validerTransition(r.getStatut(), ReservationStatus.ANNULEE);
        r.setStatut(ReservationStatus.ANNULEE);
        r.setUpdatedAt(LocalDateTime.now());
        Reservation saved = reservationRepository.save(r);
        publierEvenement("reservation.cancelled", saved);
        return toDTO(saved);
    }

    @Override
    public void supprimerReservation(String id) {
        Reservation r = trouverReservation(id);
        reservationRepository.delete(r);
        publierEvenement("reservation.deleted", r);
    }

    @Override
    public boolean verifierDisponibilite(String terrainId, LocalDateTime debut, LocalDateTime fin) {
        return reservationRepository.findOverlappingReservations(terrainId, debut, fin).isEmpty();
    }

    // ---- Private helpers ---------------------------------------------------

    private Reservation trouverReservation(String id) {
        return reservationRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Réservation introuvable: " + id));
    }

    private BigDecimal calculerPrix(Double prixParHeure, LocalDateTime debut, LocalDateTime fin) {
        if (prixParHeure == null)
            return BigDecimal.ZERO;
        double heures = Duration.between(debut, fin).toMinutes() / 60.0;
        return BigDecimal.valueOf(prixParHeure * heures).setScale(2, RoundingMode.HALF_UP);
    }

    private void validerTransition(ReservationStatus actuel, ReservationStatus nouveau) {
        Map<ReservationStatus, Set<ReservationStatus>> transitions = new EnumMap<>(ReservationStatus.class);
        transitions.put(ReservationStatus.EN_ATTENTE, Set.of(ReservationStatus.CONFIRMEE, ReservationStatus.ANNULEE));
        transitions.put(ReservationStatus.CONFIRMEE, Set.of(ReservationStatus.TERMINEE, ReservationStatus.ANNULEE));
        transitions.put(ReservationStatus.ANNULEE, Collections.emptySet());
        transitions.put(ReservationStatus.TERMINEE, Collections.emptySet());

        Set<ReservationStatus> allowed = transitions.getOrDefault(actuel, Collections.emptySet());
        if (!allowed.contains(nouveau)) {
            throw new IllegalArgumentException(
                    String.format("Transition de statut invalide: %s → %s", actuel, nouveau));
        }
    }

    private void publierEvenement(String routingKey, Object payload) {
        try {
            rabbitTemplate.convertAndSend(RabbitMQConfig.EXCHANGE, routingKey, payload);
        } catch (Exception e) {
            log.warn("Impossible de publier l'événement RabbitMQ {}: {}", routingKey, e.getMessage());
        }
    }

    private ReservationDTO toDTO(Reservation r) {
        return ReservationDTO.builder()
                .id(r.getId())
                .terrainId(r.getTerrainId())
                .organisateurId(r.getOrganisateurId())
                .dateDebut(r.getDateDebut())
                .dateFin(r.getDateFin())
                .statut(r.getStatut())
                .prixTotal(r.getPrixTotal())
                .notes(r.getNotes())
                .matchId(r.getMatchId())
                .createdAt(r.getCreatedAt())
                .updatedAt(r.getUpdatedAt())
                .build();
    }
}
