package tn.matchmakers.teamservice.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class TeamDto {

    private String id;
    private String name;
    private String sport;
    private String description;
    private String logoUrl;
    private String ownerId;

    private String city;
    private String country;
    private Integer foundedYear;
    private String coachName;
    private String homeStadium;
    private String websiteUrl;
    private String contactEmail;
    private String contactPhone;
    private Boolean isPublic;

    private List<TeamMemberDto> members;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

