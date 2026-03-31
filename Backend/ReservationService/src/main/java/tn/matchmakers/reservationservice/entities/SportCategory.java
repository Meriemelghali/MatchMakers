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

@Document(collection = "sport_categories")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SportCategory {

    @Id
    private String id;

    @NotBlank(message = "Sport category name is required")
    private String nameSportC;

    @DBRef
    @JsonIgnore
    private List<Sport> sports;
}
