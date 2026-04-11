package tn.matchmakers.userservice.dto;

import lombok.Builder;
import lombok.Data;
import tn.matchmakers.userservice.entities.enums.AccountStatus;
import tn.matchmakers.userservice.entities.enums.Sex;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class UserResponseDto {
    private String id;
    private String firstName;
    private String lastName;
    private String username;
    private String email;
    private String phoneNumber;
    private List<String> roles;
    private String bio;
    private List<String> favoriteSports;
    private AccountStatus accountStatus;
    private LocalDateTime createdAt;
    private String profilePictureUrl;
    private String avatar3dUrl;
    private Sex sex;
    private String classId;
    private tn.matchmakers.userservice.entities.enums.ThemePreference theme;
}
