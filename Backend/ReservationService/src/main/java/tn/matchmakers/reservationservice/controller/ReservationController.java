package tn.matchmakers.reservationservice.controller;

import tn.matchmakers.reservationservice.dto.ReservationRequestDto;
import tn.matchmakers.reservationservice.dto.ReservationResponseDto;
import tn.matchmakers.reservationservice.dto.ReservationDashboardDto;
import tn.matchmakers.reservationservice.service.ReservationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@CrossOrigin("*")
@RestController
@RequestMapping("/api/reservations")
@RequiredArgsConstructor
@Tag(name = "Reservations", description = "API de gestion des réservations")
public class ReservationController {

    private final ReservationService reservationService;

    @Operation(summary = "Récupérer toutes les réservations", description = "Récupère la liste paginée de toutes les réservations")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Liste des réservations récupérée avec succès")
    })
    @GetMapping
    public ResponseEntity<Page<ReservationResponseDto>> getAllReservations(
            @Parameter(description = "Pagination and sorting parameters") Pageable pageable) {
        return ResponseEntity.ok(reservationService.getAllReservations(pageable));
    }

    @Operation(summary = "Récupérer une réservation par ID", description = "Récupère les détails d'une réservation spécifique")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Réservation trouvée"),
            @ApiResponse(responseCode = "404", description = "Réservation non trouvée")
    })
    @GetMapping("/{id}")
    public ResponseEntity<ReservationResponseDto> getReservationById(
            @Parameter(description = "ID de la réservation") @PathVariable String id) {
        return ResponseEntity.ok(reservationService.getReservationById(id));
    }

    @Operation(summary = "Créer une nouvelle réservation", description = "Crée une nouvelle réservation")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "201", description = "Réservation créée avec succès"),
            @ApiResponse(responseCode = "400", description = "Données invalides")
    })
    @PostMapping
    public ResponseEntity<ReservationResponseDto> createReservation(@Valid @RequestBody ReservationRequestDto reservation) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(reservationService.createReservation(reservation));
    }

    @Operation(summary = "Mettre à jour une réservation", description = "Met à jour une réservation existante")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Réservation mise à jour avec succès"),
            @ApiResponse(responseCode = "404", description = "Réservation non trouvée"),
            @ApiResponse(responseCode = "400", description = "Données invalides")
    })
    @PutMapping("/{id}")
    public ResponseEntity<ReservationResponseDto> updateReservation(
            @Parameter(description = "ID de la réservation") @PathVariable String id,
            @Valid @RequestBody ReservationRequestDto reservation) {
        return ResponseEntity.ok(reservationService.updateReservation(id, reservation));
    }

    @Operation(summary = "Supprimer une réservation", description = "Supprime une réservation existante")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "204", description = "Réservation supprimée avec succès"),
            @ApiResponse(responseCode = "404", description = "Réservation non trouvée")
    })
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteReservation(
            @Parameter(description = "ID de la réservation") @PathVariable String id) {
        reservationService.deleteReservation(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Récupérer les statistiques des réservations d'un utilisateur", description = "Récupère les statistiques pour le dashboard")
    @GetMapping("/user/{userId}/stats")
    public ResponseEntity<ReservationDashboardDto> getReservationStatsByUser(@PathVariable String userId) {
        return ResponseEntity.ok(reservationService.getReservationStatsByUser(userId));
    }
}



