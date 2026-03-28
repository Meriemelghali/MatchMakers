package tn.matchmakers.reservationservice.entities;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.DBRef;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

@Document(collection = "sports")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Sport {

    @Id
    private String id;

    @NotBlank(message = "Sport name is required")
    private String nameSport;

    @NotNull(message = "Minimum players is required")
    @Min(value = 1, message = "Minimum players must be at least 1")
    private Integer minPlayers;

    @NotNull(message = "Maximum players is required")
    @Min(value = 1, message = "Maximum players must be at least 1")
    private Integer maxPlayers;

    @DBRef
    @NotNull(message = "Sport category is required")
    private SportCategory sportCategory;

    @DBRef
    @JsonIgnore
    private List<Reservation> reservations;
}
