package tn.matchmakers.sportservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import tn.matchmakers.sportservice.dto.external.TeamDto;
import tn.matchmakers.sportservice.entities.Club;
import tn.matchmakers.sportservice.entities.Sport;
import tn.matchmakers.sportservice.entities.UserRef;

import java.util.List;

@Data
@Builder
@AllArgsConstructor
public class ClubResponseDto {
    private String id;
    private String nameClub;
    private String city;
    private String descriptionClub;
    // URL complète du logo — ex: http://localhost:8084/api/clubs/logo/abc123.png
    private String logoUrl;
    private Sport sport;
    private String ownerId;
    private UserRef createdBy;
    // Équipes récupérées depuis TeamService (Sami — 8085)
    private List<TeamDto> teams;

    // Constructeur public
    public ClubResponseDto(Club club) {
        this.id = club.getId();
        this.nameClub = club.getNameClub();
        this.city = club.getCity();
        this.descriptionClub = club.getDescriptionClub();
        this.logoUrl = club.getLogoFileName();
        this.sport = club.getSport();
        this.ownerId = club.getOwnerId();
        this.createdBy = club.getCreatedBy();
    }
}