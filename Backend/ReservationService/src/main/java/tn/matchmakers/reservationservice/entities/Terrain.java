package tn.matchmakers.reservationservice.entities;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.DBRef;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

@Document(collection = "terrains")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Terrain {

    @Id
    private String id;

    @NotBlank(message = "Terrain name is required")
    private String nameTerrain;

    @NotBlank(message = "Terrain location is required")
    private String locationTerrain;

    @DBRef
    @JsonIgnore
    private List<Reservation> reservations;
}
