package tn.matchmakers.userservice.dto;

import lombok.Builder;
import lombok.Data;
import tn.matchmakers.userservice.entities.enums.AccountStatus;
import tn.matchmakers.userservice.entities.enums.Role;
import tn.matchmakers.userservice.entities.enums.Sex;

import java.time.LocalDateTime;

@Data
@Builder
public class UserResponseDto {
    private String idUser;
    private String firstName;
    private String lastName;
    private String username;
    private String email;
    private String phoneNumber;
    private Role role;
    private AccountStatus accountStatus;
    private LocalDateTime createdAt;
    private String profilePictureUrl;
    private Sex sex  ;
    private String classId ;
}
