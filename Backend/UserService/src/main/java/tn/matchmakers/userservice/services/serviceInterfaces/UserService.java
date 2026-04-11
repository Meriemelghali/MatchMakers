package tn.matchmakers.userservice.services.serviceInterfaces;

import tn.matchmakers.userservice.dto.UserCreateDto;
import tn.matchmakers.userservice.dto.UserResponseDto;
import tn.matchmakers.userservice.entities.User;

import java.util.List;


public interface UserService {
    List<UserResponseDto> getAllUsers();
    User getUserById(String id);
    void deleteUser(String id);
    UserResponseDto createUser(UserCreateDto userCreateDto);
    UserResponseDto assignRoleToUser(String userId, String roleName);
    UserResponseDto updateProfile(String userId, tn.matchmakers.userservice.dto.ProfileUpdateDto profileUpdateDto);
    void changePassword(String userId, tn.matchmakers.userservice.dto.ChangePasswordDto changePasswordDto);

}
