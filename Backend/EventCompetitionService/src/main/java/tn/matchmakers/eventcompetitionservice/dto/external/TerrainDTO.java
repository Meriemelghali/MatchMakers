package tn.matchmakers.eventcompetitionservice.dto.external;

import lombok.Data;

@Data
public class TerrainDTO {
    private String id;
    private String nom;
    private String ville;
    private String adresse;
    private Integer capacite;
    private String statut;
    private String typeSport;
}
