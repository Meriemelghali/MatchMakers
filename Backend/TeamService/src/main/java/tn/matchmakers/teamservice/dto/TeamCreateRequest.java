package tn.matchmakers.teamservice.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class TeamCreateRequest {

    @NotBlank
    private String name;

    @NotBlank
    private String sport;

    private String description;
    private String logoUrl;

    private String city;
    private String country;
    private Integer foundedYear;
    private String coachName;
    private String homeStadium;
    private String websiteUrl;
    private String contactEmail;
    private String contactPhone;
    private Boolean isPublic;
}

