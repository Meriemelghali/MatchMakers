package tn.matchmakers.reservationservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
public class ReservationRequestDto {

    @NotNull(message = "Start time is required")
    private LocalDateTime startTimeR;

    @NotNull(message = "End time is required")
    private LocalDateTime endTimeR;

    @NotNull(message = "Reservation status is required")
    private StatutReservation statutR;

    @NotBlank(message = "Sport ID is required")
    private String sportId;

    @NotBlank(message = "Terrain ID is required")
    private String terrainId;

    @NotNull(message = "User ID is required")
    private String idUser;
}
