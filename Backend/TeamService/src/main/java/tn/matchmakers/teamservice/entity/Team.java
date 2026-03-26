package tn.matchmakers.teamservice.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "teams")
public class Team {

    @Id
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

    @Builder.Default
    private Boolean isPublic = Boolean.TRUE;

    @Builder.Default
    private List<TeamMember> members = new ArrayList<>();

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    @Builder.Default
    private LocalDateTime updatedAt = LocalDateTime.now();
}

