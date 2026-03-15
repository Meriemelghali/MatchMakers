package tn.matchmakers.userservice.services.serviceInterfaces;

import tn.matchmakers.userservice.dto.UserCreateDto;
import tn.matchmakers.userservice.dto.UserResponseDto;
import tn.matchmakers.userservice.entities.User;

import java.util.Optional;

public interface UserService {
    UserResponseDto createUser(UserCreateDto userCreateDto);
    //Optional<User> findById(String id);
    //void deleteUser(String id);
}
