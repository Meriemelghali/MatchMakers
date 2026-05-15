package tn.matchmakers.sportservice.entities;

import lombok.*;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.DBRef;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

@Document(collection = "clubs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Club {
    @Id
    private String id;

    private String nameClub;
    private String city;
    private String descriptionClub;

    // Logo — nom du fichier stocké localement
    // Accessible via GET /api/clubs/logo/{fileName}
    private String logoFileName;

    // Références vers Sports (même service)
    @DBRef
    @Builder.Default
    private List<Sport> sports = new ArrayList<>();

    // IDs des équipes (référence vers TeamService de Sami — port 8085)
    @Builder.Default
    private List<String> teamIds = new ArrayList<>();

    // ID du propriétaire (référence vers UserService)
    private String ownerId;
    private UserRef createdBy;
}
