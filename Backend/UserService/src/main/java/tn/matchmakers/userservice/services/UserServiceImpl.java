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
import tn.matchmakers.userservice.entities.Role;
import tn.matchmakers.userservice.exceptions.DuplicateEntityException;
import tn.matchmakers.userservice.mapper.UserMapper;
import tn.matchmakers.userservice.repositories.RoleRepository;
import tn.matchmakers.userservice.repositories.UserRepository;
import tn.matchmakers.userservice.services.serviceInterfaces.UserService;


import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserServiceImpl implements UserService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final RoleRepository roleRepository;
    private final EmailService emailService;



    @Override
    public UserResponseDto createUser(UserCreateDto userCreateDto) {
        // Validate unique constraints
        if (userRepository.existsByEmail(userCreateDto.getEmail())) {
            throw new DuplicateEntityException("Email already exists");
        }
        if (!userCreateDto.getPassword().equals(userCreateDto.getConfirmPassword())) {
            throw new IllegalArgumentException("Passwords do not match");
        }
        // Récupère le rôle SPORTIF depuis la DB
        Role sportifRole = roleRepository.findByName("SPORTIF")
                .orElseThrow(() -> new RuntimeException("Role SPORTIF not found — run DataInitializer"));

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
        user.addRole(sportifRole);
        if (user.hasRole("SPORTIF")) {
            user.setClassId("1");
        }
        User savedUser = userRepository.save(user);
        Map<String, Object> variables = new HashMap<>();
        variables.put("nom", user.getLastName());
        variables.put("prenom", user.getFirstName());
        variables.put("email", user.getEmail());
        userRepository.save(savedUser);

        // Lire le template HTML
        // Envoi mail HTML avec template
        try {
            String htmlTemplate = Files.readString(Paths.get("src/main/resources/templates/welcome-template.html"));
            htmlTemplate = htmlTemplate
                    .replace("{{prenom}}", savedUser.getFirstName())
                    .replace("{{email}}", savedUser.getEmail());

            emailService.sendHtmlEmail(
                    savedUser.getEmail(),
                    "Bienvenue chez MatchMakers !",
                    htmlTemplate
            );
        } catch (IOException | jakarta.mail.MessagingException e) {
            e.printStackTrace();
            log.error("Erreur lors de l'envoi du mail à {}", savedUser.getEmail(), e);
        }

        // Mail à l'utilisateur
        emailService.sendSimpleEmail(
                savedUser.getEmail(),
                "Bienvenue chez MatchMakers !",
                "Salut " + savedUser.getFirstName() + ", ton compte a été créé avec succès 🔥"
        );
        return UserMapper.mapToUserResponseDto(savedUser);
    }

    public User getUserById(String id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new UsernameNotFoundException("Utilisateur non trouvé"));
    }

    @Override
    public List<UserResponseDto> getAllUsers() {
        return userRepository.findAll()
                .stream()
                .map(UserMapper::mapToUserResponseDto)
                .collect(Collectors.toList());
    }

    @Override
    public void deleteUser(String id) {
        if (!userRepository.existsById(id)) {
            throw new RuntimeException("User not found");
        }
        userRepository.deleteById(id);
    }
    public UserResponseDto assignRoleToUser(String userId, String roleName) {
        // Récupère l'utilisateur
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé: " + userId));

        // Récupère le rôle depuis la DB
        Role role = roleRepository.findByName(roleName.toUpperCase())
                .orElseThrow(() -> new RuntimeException("Rôle non trouvé: " + roleName));

        // Ajoute le rôle seulement s'il ne l'a pas déjà
        if (user.hasRole(roleName.toUpperCase())) {
            throw new IllegalArgumentException("L'utilisateur a déjà le rôle: " + roleName);
        }

        user.addRole(role);
        User savedUser = userRepository.save(user);
        return UserMapper.mapToUserResponseDto(savedUser);
    }

    @Override
    public UserResponseDto updateProfile(String userId, tn.matchmakers.userservice.dto.ProfileUpdateDto profileUpdateDto) {
        log.info("Mise à jour du profil pour l'utilisateur: {}", userId);
        log.info("Données reçues - Sports: {}, Bio: {}", profileUpdateDto.getFavoriteSports(), profileUpdateDto.getBio());

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UsernameNotFoundException("Utilisateur non trouvé"));

        user.setFirstName(profileUpdateDto.getFirstName());
        user.setLastName(profileUpdateDto.getLastName());
        user.setBio(profileUpdateDto.getBio());
        user.setPhoneNumber(profileUpdateDto.getPhoneNumber());
        
        if (profileUpdateDto.getAvatar3dUrl() != null) {
            user.setAvatar3dUrl(profileUpdateDto.getAvatar3dUrl());
        }
        
        if (profileUpdateDto.getFavoriteSports() != null && profileUpdateDto.getFavoriteSports().size() > 3) {
            throw new IllegalArgumentException("Vous ne pouvez pas sélectionner plus de 3 sports");
        }
        user.setFavoriteSports(profileUpdateDto.getFavoriteSports());
        
        if (profileUpdateDto.getTheme() != null) {
            user.setTheme(profileUpdateDto.getTheme());
        }

        log.info("Entité User prête pour sauvegarde - Sports: {}", user.getFavoriteSports());
        User savedUser = userRepository.save(user);
        log.info("Sauvegarde effectuée avec succès pour: {}", userId);

        return UserMapper.mapToUserResponseDto(savedUser);
    }

    @Override
    public void changePassword(String userId, tn.matchmakers.userservice.dto.ChangePasswordDto changePasswordDto) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UsernameNotFoundException("Utilisateur non trouvé"));

        if (!passwordEncoder.matches(changePasswordDto.getCurrentPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Le mot de passe actuel est incorrect");
        }

        user.setPasswordHash(passwordEncoder.encode(changePasswordDto.getNewPassword()));
        user.setTokenVersion(user.getTokenVersion() + 1); // Invalider les anciens tokens
        userRepository.save(user);
    }

}
