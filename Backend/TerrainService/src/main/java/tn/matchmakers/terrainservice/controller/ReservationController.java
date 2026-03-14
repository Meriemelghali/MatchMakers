package tn.matchmakers.terrainservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.matchmakers.terrainservice.dto.CreateReservationRequest;
import tn.matchmakers.terrainservice.dto.ReservationDTO;
import tn.matchmakers.terrainservice.service.ReservationService;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/reservations")
@RequiredArgsConstructor
public class ReservationController {

    private final ReservationService reservationService;

    @PostMapping
    public ResponseEntity<ReservationDTO> creerReservation(@Valid @RequestBody CreateReservationRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(reservationService.creerReservation(request));
    }

    @GetMapping
    public ResponseEntity<List<ReservationDTO>> obtenirToutesLesReservations() {
        return ResponseEntity.ok(reservationService.obtenirToutesLesReservations());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ReservationDTO> obtenirReservation(@PathVariable String id) {
        return ResponseEntity.ok(reservationService.obtenirReservation(id));
    }

    @GetMapping("/terrain/{terrainId}")
    public ResponseEntity<List<ReservationDTO>> obtenirReservationsDuTerrain(@PathVariable String terrainId) {
        return ResponseEntity.ok(reservationService.obtenirReservationsDuTerrain(terrainId));
    }

    @PatchMapping("/{id}/confirmer")
    public ResponseEntity<ReservationDTO> confirmerReservation(@PathVariable String id) {
        return ResponseEntity.ok(reservationService.confirmerReservation(id));
    }

    @PatchMapping("/{id}/annuler")
    public ResponseEntity<ReservationDTO> annulerReservation(@PathVariable String id) {
        return ResponseEntity.ok(reservationService.annulerReservation(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> supprimerReservation(@PathVariable String id) {
        reservationService.supprimerReservation(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/disponibilite")
    public ResponseEntity<Map<String, Boolean>> verifierDisponibilite(
            @RequestParam String terrainId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime debut,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime fin) {
        boolean disponible = reservationService.verifierDisponibilite(terrainId, debut, fin);
        return ResponseEntity.ok(Map.of("disponible", disponible));
    }
}
