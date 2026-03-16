package tn.matchmakers.sportservice.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import tn.matchmakers.sportservice.entities.Sport;

import java.util.List;

@Data
public class ClubCreateDto {
    @NotBlank(message = "Le nom du club est requis")
    private String nameClub;

    @NotBlank(message = "city est requis")
    private String city;

    @NotBlank(message = "La description du club est requis")
    private String descriptionClub;

    private String logoFileName;
    private Sport sport;
    private List<String> teamIds;

    private String ownerId;
}