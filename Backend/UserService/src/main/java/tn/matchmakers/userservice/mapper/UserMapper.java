package tn.matchmakers.userservice.mapper;

import tn.matchmakers.userservice.dto.UserResponseDto;
import tn.matchmakers.userservice.entities.User;

public class UserMapper {
    public static UserResponseDto mapToUserResponseDto(User user) {
        return UserResponseDto.builder()
                .profilePictureUrl(user.getProfilePictureUrl())
                .avatar3dUrl(user.getAvatar3dUrl())
                .id(user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .username(user.getUsername())
                .email(user.getEmail())
                .roles(user.getRoles().stream()
                        .map(role -> role.getName())
                        .collect(java.util.stream.Collectors.toList()))
                .accountStatus(user.getAccountStatus())
                .createdAt(user.getCreatedAt())
                .phoneNumber(user.getPhoneNumber())
                .sex(user.getSex())
                .bio(user.getBio())
                .favoriteSports(user.getFavoriteSports())
                .classId(user.getClassId())
                .fitnessLevel(user.getFitnessLevel())
                .fitnessGoals(user.getFitnessGoals())
                .weight(user.getWeight())
                .height(user.getHeight())
                .theme(user.getTheme())
                .build();
    }
}
