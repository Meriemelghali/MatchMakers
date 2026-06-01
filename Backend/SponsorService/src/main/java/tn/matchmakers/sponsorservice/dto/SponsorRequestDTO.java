package tn.matchmakers.sponsorservice.dto;

import lombok.Getter;
import lombok.Setter;

@Getter @Setter
public class SponsorRequestDTO {
    private String userId;
    private String userEmail;
    private String companyName;
    private String description;
    private String logoUrl;
    private String website;
    private String contactEmail;
    private String contactPhone;
    private String targetSport;
    private double budget;
}