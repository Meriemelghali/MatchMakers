package tn.matchmakers.reservationservice.service;

import tn.matchmakers.reservationservice.dto.ReservationRequestDto;
import tn.matchmakers.reservationservice.dto.ReservationResponseDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface ReservationService {
    Page<ReservationResponseDto> getAllReservations(Pageable pageable);
    ReservationResponseDto getReservationById(String id);
    ReservationResponseDto createReservation(ReservationRequestDto reservation);
    ReservationResponseDto updateReservation(String id, ReservationRequestDto reservation);
    void deleteReservation(String id);
}
