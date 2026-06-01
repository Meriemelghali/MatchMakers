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
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.core.io.ClassPathResource;
import org.springframework.util.StreamUtils;

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
            String htmlTemplate = StreamUtils.copyToString(new ClassPathResource("templates/welcome-template.html").getInputStream(), StandardCharsets.UTF_8);
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
        
        // Fitness profile update
        user.setFitnessLevel(profileUpdateDto.getFitnessLevel());
        user.setFitnessGoals(profileUpdateDto.getFitnessGoals());
        user.setWeight(profileUpdateDto.getWeight());
        user.setHeight(profileUpdateDto.getHeight());
        
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

    @Override
    public void notifyUsersForNewEvent(tn.matchmakers.userservice.dto.EventNotificationDto dto) {
        log.info("Notification des utilisateurs pour l'événement: {} (Sport: {})", dto.getTitle(), dto.getSportName());

        // We fetch all users and filter in Java to ensure case-insensitive matching in the favoriteSports list
        String targetSport = dto.getSportName().trim().toLowerCase();
        List<User> allUsers = userRepository.findAll();
        
        List<User> interestedUsers = allUsers.stream()
                .filter(u -> u.getFavoriteSports() != null && 
                             u.getFavoriteSports().stream()
                                     .anyMatch(s -> s.trim().toLowerCase().equals(targetSport)))
                .collect(Collectors.toList());
        
        if (interestedUsers.isEmpty()) {
            log.info("Aucun utilisateur intéressé par le sport (insensible à la casse): {}", dto.getSportName());
            return;
        }

        log.info("Envoi de {} invitations par email...", interestedUsers.size());

        try {
            String htmlTemplate = StreamUtils.copyToString(new ClassPathResource("templates/event-invitation.html").getInputStream(), StandardCharsets.UTF_8);
            
            // Préparer le contenu avec les détails de l'événement
            String customizedHtml = htmlTemplate
                    .replace("{{sportName}}", dto.getSportName())
                    .replace("{{title}}", dto.getTitle())
                    .replace("{{description}}", dto.getDescription())
                    .replace("{{location}}", dto.getLocation())
                    .replace("{{startDate}}", dto.getStartDate().toString())
                    .replace("{{endDate}}", dto.getEndDate().toString());

            for (User user : interestedUsers) {
                try {
                    emailService.sendHtmlEmail(
                            user.getEmail(),
                            "Invitation MatchMakers : " + dto.getTitle() + " (" + dto.getSportName() + ")",
                            customizedHtml
                    );
                } catch (jakarta.mail.MessagingException e) {
                    log.error("Échec de l'envoi de l'invitation à {}: {}", user.getEmail(), e.getMessage());
                }
            }
        } catch (IOException e) {
            log.error("Erreur technique lors du chargement du template d'invitation", e);
        }
    }

    @Override
    public void updateFairPlayScore(String userId, Integer points) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UsernameNotFoundException("Utilisateur non trouvé"));
        
        int currentScore = user.getFairPlayScore() != null ? user.getFairPlayScore() : 1000;
        user.setFairPlayScore(currentScore + points);
        userRepository.save(user);
        log.info("Fair-Play Score mis à jour pour {}: {} (Delta: {})", userId, user.getFairPlayScore(), points);
    }

    @Override
    public User getUserByUsernameOrName(String query) {
        // 1. Essayer par Username
        return userRepository.findByUsernameIgnoreCase(query.trim())
            .or(() -> {
                // 2. Essayer par Prénom + Nom (si espace présent)
                String[] parts = query.trim().split(" ");
                if (parts.length >= 2) {
                    // Essayer : parts[0] (Prénom) et le reste (Nom)
                    String firstName = parts[0];
                    String lastName = String.join(" ", java.util.Arrays.copyOfRange(parts, 1, parts.length));
                    
                    java.util.List<User> foundList = userRepository.findByFirstNameIgnoreCaseAndLastNameIgnoreCase(firstName, lastName);
                    if (!foundList.isEmpty()) return java.util.Optional.of(foundList.get(0));

                    // Essayer aussi sans espace dans le nom (ex: "El Ghali" -> "ElGhali")
                    String lastNameNoSpace = lastName.replace(" ", "");
                    foundList = userRepository.findByFirstNameIgnoreCaseAndLastNameIgnoreCase(firstName, lastNameNoSpace);
                    if (!foundList.isEmpty()) return java.util.Optional.of(foundList.get(0));
                }
                return java.util.Optional.empty();
            })
            .orElseThrow(() -> new UsernameNotFoundException("Utilisateur non trouvé avec: " + query));
    }

    @Override
    public void applySanction(String userId, String message, String type, Integer points) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UsernameNotFoundException("Utilisateur non trouvé"));

        // 1. Mettre à jour le score si nécessaire
        if (points != null && points != 0) {
            int currentScore = user.getFairPlayScore() != null ? user.getFairPlayScore() : 1000;
            user.setFairPlayScore(currentScore + points);
        }

        // 2. Gérer le statut et les messages
        user.setPendingSanctionMessage(message);
        user.setPendingSanctionType(type);

        if ("BAN".equals(type) || "BAN_DEFINITIF".equals(type)) {
            user.setAccountStatus(AccountStatus.BANNED);
            log.warn("L'utilisateur {} a été BANNI.", userId);
        }

        userRepository.save(user);

        // 3. Envoyer l'email en HTML
        String subject = "MatchMakers - Notification Disciplinaire";
        
        StringBuilder htmlBuilder = new StringBuilder();
        htmlBuilder.append("<div style=\"font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #1a1c23; padding: 30px; border-radius: 12px; color: #ffffff; border: 1px solid #2a2d35; box-shadow: 0 8px 24px rgba(0,0,0,0.2);\">");
        
        // Header / Logo
        htmlBuilder.append("<div style=\"text-align: center; margin-bottom: 30px; border-bottom: 1px solid #2a2d35; padding-bottom: 20px;\">")
                   .append("<h1 style=\"color: #E8500A; margin: 0; font-size: 32px; letter-spacing: 2px; text-transform: uppercase;\">Match<span style=\"color:#ffffff;\">Makers</span></h1>")
                   .append("<p style=\"color: #a0a5b1; margin-top: 8px; font-size: 14px; font-weight: 500;\">FAIR-PLAY & COMMUNAUTÉ</p>")
                   .append("</div>");
        
        // Body
        htmlBuilder.append("<div style=\"background-color: #22252e; padding: 25px; border-radius: 8px;\">")
                   .append("<h2 style=\"color: #ffffff; margin-top: 0; font-size: 22px;\">Notification Disciplinaire</h2>")
                   .append("<p style=\"color: #d1d5db; font-size: 16px; line-height: 1.6;\">Bonjour <strong style=\"color:#ffffff;\">").append(user.getFirstName()).append("</strong>,</p>")
                   .append("<p style=\"color: #d1d5db; font-size: 16px; line-height: 1.6;\">Nous vous informons qu'une mesure disciplinaire a été prise à votre encontre suite à un signalement de la communauté.</p>");
        
        // Sanction Box
        htmlBuilder.append("<div style=\"background-color: rgba(220, 38, 38, 0.1); border-left: 4px solid #dc2626; padding: 20px; margin: 25px 0; border-radius: 4px;\">")
                   .append("<p style=\"margin: 0 0 10px 0; color: #fca5a5; font-size: 15px;\"><strong style=\"color:#ef4444;\">TYPE DE SANCTION :</strong> ").append(type).append("</p>")
                   .append("<p style=\"margin: 0; color: #fca5a5; font-size: 15px;\"><strong style=\"color:#ef4444;\">MOTIF :</strong> ").append(message).append("</p>");
        
        if (points != null && points < 0) {
            htmlBuilder.append("<p style=\"margin: 15px 0 0 0; color: #fca5a5; font-size: 15px; border-top: 1px solid rgba(220,38,38,0.2); padding-top: 15px;\">")
                       .append("<strong style=\"color:#ef4444;\">IMPACT SCORE FPS :</strong> ").append(points).append(" points</p>");
        }
        htmlBuilder.append("</div>");

        if ("BAN".equals(type) || "BAN_DEFINITIF".equals(type)) {
            htmlBuilder.append("<div style=\"background-color: #dc2626; color: white; padding: 15px; border-radius: 6px; text-align: center; margin-bottom: 20px;\">")
                       .append("<p style=\"margin: 0; font-weight: bold; font-size: 16px;\">🚨 Votre compte a été suspendu définitivement.</p>")
                       .append("<p style=\"margin: 5px 0 0 0; font-size: 14px;\">En raison de récidives multiples (3 sanctions en moins de 60 jours).</p>")
                       .append("</div>");
        }

        htmlBuilder.append("<p style=\"color: #9ca3af; font-size: 14px; line-height: 1.6; margin-top: 30px;\">Notre système de Fair-Play a pour but de garantir un environnement sain et respectueux pour tous les joueurs. Merci de respecter ces valeurs.</p>")
                   .append("<p style=\"color: #d1d5db; font-size: 15px; margin-top: 25px;\">Sportivement,<br><strong style=\"color:#E8500A;\">L'équipe MatchMakers</strong></p>")
                   .append("</div>");
                   
        // Footer
        htmlBuilder.append("<div style=\"text-align: center; margin-top: 25px; font-size: 12px; color: #6b7280;\">")
                   .append("<p>© 2026 MatchMakers. Tous droits réservés.</p>")
                   .append("</div>")
                   .append("</div>");

        try {
            emailService.sendHtmlEmail(user.getEmail(), subject, htmlBuilder.toString());
            log.info("Sanction appliquée et email HTML envoyé à {}", user.getEmail());
        } catch (Exception e) {
            log.error("Erreur lors de l'envoi de l'email HTML de sanction: {}", e.getMessage());
        }
    }

    @Override
    public void clearSanctionMessage(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UsernameNotFoundException("Utilisateur non trouvé"));
        user.setPendingSanctionMessage(null);
        user.setPendingSanctionType(null);
        userRepository.save(user);
    }

    @Override
    public void pardonUser(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new UsernameNotFoundException("Utilisateur non trouvé"));

        user.setAccountStatus(AccountStatus.ACTIVE);
        user.setFairPlayScore(1000);
        user.setPendingSanctionMessage(null);
        user.setPendingSanctionType(null);
        
        userRepository.save(user);

        // Envoyer email de pardon
        String subject = "MatchMakers - Bonne nouvelle ! Votre compte a été réactivé";
        StringBuilder htmlBuilder = new StringBuilder();
        htmlBuilder.append("<div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc; padding: 30px; border-radius: 12px; border: 1px solid #e2e8f0;\">");
        htmlBuilder.append("<div style=\"text-align: center; margin-bottom: 20px;\">")
                   .append("<h1 style=\"color: #10b981; margin: 0;\">Compte Réactivé</h1>")
                   .append("</div>");
        htmlBuilder.append("<p style=\"color: #334155;\">Bonjour <strong>").append(user.getFirstName()).append("</strong>,</p>");
        htmlBuilder.append("<p style=\"color: #334155; line-height: 1.5;\">Suite à une révision de votre dossier par notre équipe, nous avons le plaisir de vous informer que votre compte MatchMakers a été <strong>débanni</strong>.</p>");
        htmlBuilder.append("<div style=\"background-color: #dcfce7; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;\">");
        htmlBuilder.append("<p style=\"color: #065f46; margin: 0;\"><strong>Nouveau départ :</strong> Votre score de Fair-Play a été réinitialisé à 1000 points.</p>");
        htmlBuilder.append("</div>");
        htmlBuilder.append("<p style=\"color: #334155; margin-top: 20px;\">Merci de respecter la charte de bonne conduite lors de vos prochaines parties.</p>");
        htmlBuilder.append("<p style=\"color: #334155; margin-top: 30px;\">Sportivement,<br><strong style=\"color:#e8500a;\">L'équipe MatchMakers</strong></p>");
        htmlBuilder.append("</div>");

        try {
            emailService.sendHtmlEmail(user.getEmail(), subject, htmlBuilder.toString());
            log.info("Email de pardon envoyé à {}", user.getEmail());
        } catch (Exception e) {
            log.error("Erreur lors de l'envoi de l'email de pardon: {}", e.getMessage());
        }
    }
}
