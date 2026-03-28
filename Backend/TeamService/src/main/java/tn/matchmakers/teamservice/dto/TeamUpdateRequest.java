package tn.matchmakers.teamservice.dto;

import lombok.Data;

@Data
public class TeamUpdateRequest {

    private String name;
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

