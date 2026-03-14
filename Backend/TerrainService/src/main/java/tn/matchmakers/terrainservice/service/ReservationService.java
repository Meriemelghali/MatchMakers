package tn.matchmakers.terrainservice.service;

import tn.matchmakers.terrainservice.dto.CreateReservationRequest;
import tn.matchmakers.terrainservice.dto.ReservationDTO;

import java.time.LocalDateTime;
import java.util.List;

public interface ReservationService {
    ReservationDTO creerReservation(CreateReservationRequest request);

    ReservationDTO obtenirReservation(String id);

    List<ReservationDTO> obtenirToutesLesReservations();

    List<ReservationDTO> obtenirReservationsDuTerrain(String terrainId);

    ReservationDTO confirmerReservation(String id);

    ReservationDTO annulerReservation(String id);

    void supprimerReservation(String id);

    boolean verifierDisponibilite(String terrainId, LocalDateTime debut, LocalDateTime fin);
}
