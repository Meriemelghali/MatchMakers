package tn.matchmakers.sportservice.dto.external;

import lombok.Data;



@Data
public class TeamDto {
    private String id;
    private String name;
    private String sport;
    private String description;
    private String logoUrl;
}
