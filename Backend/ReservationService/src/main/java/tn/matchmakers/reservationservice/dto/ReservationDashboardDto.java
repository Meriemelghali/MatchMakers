package tn.matchmakers.reservationservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ReservationDashboardDto {
    private long totalReservations;
    private long confirmedReservations;
    private long pendingReservations;
    private long cancelledReservations;
    private Map<String, Long> reservationsBySport; // SportId -> Count
    private Map<String, Long> reservationsByStatus; // Status -> Count
}
