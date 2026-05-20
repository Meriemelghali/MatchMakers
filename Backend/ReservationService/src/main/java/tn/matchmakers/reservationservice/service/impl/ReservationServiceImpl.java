package tn.matchmakers.reservationservice.service.impl;

import tn.matchmakers.reservationservice.dto.ReservationDashboardDto;
import tn.matchmakers.reservationservice.dto.ReservationRequestDto;
import tn.matchmakers.reservationservice.dto.ReservationResponseDto;
import tn.matchmakers.reservationservice.entities.Reservation;
import tn.matchmakers.reservationservice.entities.Sport;
import tn.matchmakers.reservationservice.entities.StatutReservation;
import tn.matchmakers.reservationservice.entities.Terrain;
import tn.matchmakers.reservationservice.repository.ReservationRepository;
import tn.matchmakers.reservationservice.service.ReservationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class ReservationServiceImpl implements ReservationService {

    private final ReservationRepository reservationRepository;

    @Override
    public Page<ReservationResponseDto> getAllReservations(Pageable pageable) {
        log.info("Fetching all reservations with pagination");
        return reservationRepository.findAll(pageable).map(this::toResponseDto);
    }

    @Override
    public ReservationResponseDto getReservationById(String id) {
        log.info("Fetching reservation with id: {}", id);
        return toResponseDto(findByIdOrThrow(id));
    }

    @Override
    public ReservationResponseDto createReservation(ReservationRequestDto reservation) {
        log.info("Creating new reservation for terrain: {}", reservation.getTerrainId());
        
        if (!isTerrainAvailable(reservation.getTerrainId(), reservation.getStartTimeR(), reservation.getEndTimeR(), null)) {
            throw new RuntimeException("Le terrain est déjà réservé pour ce créneau horaire.");
        }

        if (!isUserAvailableForSport(reservation.getIdUser(), reservation.getSportId(), reservation.getStartTimeR(), reservation.getEndTimeR(), null)) {
            throw new RuntimeException("Vous avez déjà une réservation pour cette discipline sportive dans le même créneau horaire.");
        }

        Reservation entity = fromRequestDto(reservation);
        entity.setId(null);
        return toResponseDto(reservationRepository.save(entity));
    }

    @Override
    public ReservationResponseDto updateReservation(String id, ReservationRequestDto reservation) {
        log.info("Updating reservation with id: {}", id);
        
        if (!isTerrainAvailable(reservation.getTerrainId(), reservation.getStartTimeR(), reservation.getEndTimeR(), id)) {
            throw new RuntimeException("Le terrain est déjà réservé pour ce créneau horaire.");
        }

        if (!isUserAvailableForSport(reservation.getIdUser(), reservation.getSportId(), reservation.getStartTimeR(), reservation.getEndTimeR(), id)) {
            throw new RuntimeException("Vous avez déjà une réservation pour cette discipline sportive dans le même créneau horaire.");
        }

        Reservation existingReservation = findByIdOrThrow(id);
        existingReservation.setStartTimeR(reservation.getStartTimeR());
        existingReservation.setEndTimeR(reservation.getEndTimeR());
        existingReservation.setStatutR(reservation.getStatutR());
        existingReservation.setSportId(reservation.getSportId());
        existingReservation.setTerrainId(reservation.getTerrainId());
        existingReservation.setIdUser(reservation.getIdUser());
        return toResponseDto(reservationRepository.save(existingReservation));
    }

    @Override
    public void deleteReservation(String id) {
        log.info("Deleting reservation with id: {}", id);
        Reservation reservation = findByIdOrThrow(id);
        reservationRepository.delete(reservation);
    }

    @Override
    public ReservationDashboardDto getReservationStatsByUser(String userId) {
        log.info("Calculating stats for user: {}", userId);
        List<Reservation> userReservations = reservationRepository.findByIdUser(userId);

        long total = userReservations.size();
        long confirmed = userReservations.stream().filter(r -> r.getStatutR() == StatutReservation.CONFIRMED).count();
        long pending = userReservations.stream().filter(r -> r.getStatutR() == StatutReservation.PENDING).count();
        long cancelled = userReservations.stream().filter(r -> r.getStatutR() == StatutReservation.CANCELLED).count();

        Map<String, Long> bySport = userReservations.stream()
                .collect(Collectors.groupingBy(Reservation::getSportId, Collectors.counting()));

        Map<String, Long> byStatus = userReservations.stream()
                .collect(Collectors.groupingBy(r -> r.getStatutR().name(), Collectors.counting()));

        return ReservationDashboardDto.builder()
                .totalReservations(total)
                .confirmedReservations(confirmed)
                .pendingReservations(pending)
                .cancelledReservations(cancelled)
                .reservationsBySport(bySport)
                .reservationsByStatus(byStatus)
                .build();
    }

    private Reservation findByIdOrThrow(String id) {
        return reservationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Reservation not found with id: " + id));
    }

    private boolean isTerrainAvailable(String terrainId, java.time.LocalDateTime start, java.time.LocalDateTime end, String excludeReservationId) {
        List<Reservation> existing = reservationRepository.findByTerrainId(terrainId);
        
        return existing.stream()
            .filter(r -> r.getStatutR() != StatutReservation.CANCELLED)
            .filter(r -> excludeReservationId == null || !r.getId().equals(excludeReservationId))
            .noneMatch(r -> start.isBefore(r.getEndTimeR()) && end.isAfter(r.getStartTimeR()));
    }

    private boolean isUserAvailableForSport(String userId, String sportId, java.time.LocalDateTime start, java.time.LocalDateTime end, String excludeReservationId) {
        List<Reservation> userReservations = reservationRepository.findByIdUser(userId);
        
        return userReservations.stream()
            .filter(r -> r.getStatutR() != StatutReservation.CANCELLED)
            .filter(r -> r.getSportId().equals(sportId))
            .filter(r -> excludeReservationId == null || !r.getId().equals(excludeReservationId))
            .noneMatch(r -> start.isBefore(r.getEndTimeR()) && end.isAfter(r.getStartTimeR()));
    }

    private Reservation fromRequestDto(ReservationRequestDto dto) {
        return Reservation.builder()
                .startTimeR(dto.getStartTimeR())
                .endTimeR(dto.getEndTimeR())
                .statutR(dto.getStatutR())
                .sportId(dto.getSportId())       // ✅ direct
                .terrainId(dto.getTerrainId())   // ✅ direct
                .idUser(dto.getIdUser())
                .build();
    }

    /**
     * Référence uniquement par id pour {@code @DBRef} : le document sport peut exister dans une autre base / un autre microservice.
     */
    private static Sport sportRef(String idSport) {
        Sport s = new Sport();
        s.setId(idSport);
        return s;
    }

    /**
     * Référence uniquement par id pour {@code @DBRef} : le document terrain peut exister dans une autre base / un autre microservice.
     */
    private static Terrain terrainRef(String idTerrain) {
        Terrain t = new Terrain();
        t.setId(idTerrain);
        return t;
    }

    private ReservationResponseDto toResponseDto(Reservation reservation) {
        return ReservationResponseDto.builder()
                .idReservation(reservation.getId())
                .startTimeR(reservation.getStartTimeR())
                .endTimeR(reservation.getEndTimeR())
                .statutR(reservation.getStatutR())
                .sportId(reservation.getSportId())       // ✅ direct
                .terrainId(reservation.getTerrainId())   // ✅ direct
                .idUser(reservation.getIdUser())
                .build();
    }
}
