package tn.matchmakers.userservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProfileUpdateDto {
    private String firstName;
    private String lastName;
    private String bio;
    private String phoneNumber;
    private String avatar3dUrl;
    private java.util.List<String> favoriteSports;
    private String fitnessLevel;
    private java.util.List<String> fitnessGoals;
    private Double weight;
    private Double height;
    private tn.matchmakers.userservice.entities.enums.ThemePreference theme;
}
