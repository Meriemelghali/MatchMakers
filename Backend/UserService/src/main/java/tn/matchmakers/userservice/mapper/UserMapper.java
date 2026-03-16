package tn.matchmakers.userservice.mapper;

import tn.matchmakers.userservice.dto.UserResponseDto;
import tn.matchmakers.userservice.entities.User;

public class UserMapper {
    public static UserResponseDto mapToUserResponseDto(User user) {
        return UserResponseDto.builder()
                .profilePictureUrl(user.getProfilePictureUrl())
                .idUser(user.getId())
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
                .classId(user.getClassId())
                .build();
    }
}
