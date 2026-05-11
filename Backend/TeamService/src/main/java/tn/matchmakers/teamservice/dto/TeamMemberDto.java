package tn.matchmakers.teamservice.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class TeamMemberDto {

    private String userId;
    private String username;
    private String role;
    private LocalDateTime joinDate;
}

