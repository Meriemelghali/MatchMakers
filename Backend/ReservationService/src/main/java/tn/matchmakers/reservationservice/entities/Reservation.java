package tn.matchmakers.reservationservice.entities;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.DBRef;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "reservations")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Reservation {

    @Id
    private String id;

    @NotNull(message = "Start time is required")
    private LocalDateTime startTimeR;

    @NotNull(message = "End time is required")
    private LocalDateTime endTimeR;

    @NotNull(message = "Reservation status is required")
    private StatutReservation statutR;

    @NotNull(message = "Sport is required")
    private String sportId;

    @NotNull(message = "Terrain is required")
    private String terrainId;

    @NotNull(message = "User ID is required")
    private String idUser;

    @Builder.Default
    private boolean reminderSent = false;

    @org.springframework.data.annotation.CreatedDate
    private LocalDateTime createdAt;
}
