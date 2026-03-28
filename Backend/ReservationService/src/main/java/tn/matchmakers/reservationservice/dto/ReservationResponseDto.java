package tn.matchmakers.reservationservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import tn.matchmakers.reservationservice.entities.StatutReservation;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReservationResponseDto {
    private String idReservation;
    private LocalDateTime startTimeR;
    private LocalDateTime endTimeR;
    private StatutReservation statutR;
    private String sportId;
    private String terrainId;
    private String idUser;
}
