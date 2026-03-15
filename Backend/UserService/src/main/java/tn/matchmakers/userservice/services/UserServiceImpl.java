package tn.matchmakers.userservice.services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import tn.matchmakers.userservice.dto.UserCreateDto;
import tn.matchmakers.userservice.dto.UserResponseDto;
import tn.matchmakers.userservice.entities.User;
import tn.matchmakers.userservice.entities.enums.AccountStatus;
import tn.matchmakers.userservice.entities.enums.Role;
import tn.matchmakers.userservice.exceptions.DuplicateEntityException;
import tn.matchmakers.userservice.mapper.UserMapper;
import tn.matchmakers.userservice.repositories.UserRepository;
import tn.matchmakers.userservice.services.serviceInterfaces.UserService;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserServiceImpl implements UserService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public UserResponseDto createUser(UserCreateDto userCreateDto) {
        // Validate unique constraints
        if (userRepository.existsByEmail(userCreateDto.getEmail())) {
            throw new DuplicateEntityException("Email already exists");
        }
        if (!userCreateDto.getPassword().equals(userCreateDto.getConfirmPassword())) {
            throw new IllegalArgumentException("Passwords do not match");
        }
        // Create and save user
        User user = new User();
        user.setFirstName(userCreateDto.getFirstName());
        user.setLastName(userCreateDto.getLastName());
        user.setUsername(userCreateDto.getUsername());
        user.setEmail(userCreateDto.getEmail());
        user.setPasswordHash(passwordEncoder.encode(userCreateDto.getPassword()));
        user.setPhoneNumber(userCreateDto.getPhoneNumber());
        user.setAccountStatus(AccountStatus.ACTIVE);
        user.setSex(userCreateDto.getSex());
        // temporary
        if(user.getRole().equals(Role.SPORTIF)){
            user.setClassId("1");
        }
        User savedUser = userRepository.save(user);
        Map<String, Object> variables = new HashMap<>();
        variables.put("nom", user.getLastName());
        variables.put("prenom", user.getFirstName());
        variables.put("email", user.getEmail());
        /*emailService.sendHtmlEmail(
                user.getEmail(),
                "Esprit-PI :  information sur le compte crée.",
                "account-created", variables
        );*/
        userRepository.save(savedUser);
        return UserMapper.mapToUserResponseDto(savedUser);
    }

    public User getUserById(String id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new UsernameNotFoundException("Utilisateur non trouvé"));
    }

}
