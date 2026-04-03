package tn.matchmakers.userservice.services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.security.crypto.password.PasswordEncoder;
import com.google.common.hash.Hashing;

import tn.matchmakers.userservice.dto.AuthResponse;
import tn.matchmakers.userservice.dto.LoginRequest;
import tn.matchmakers.userservice.entities.DeviceInfo;
import tn.matchmakers.userservice.entities.Session;
import tn.matchmakers.userservice.entities.User;
import tn.matchmakers.userservice.entities.enums.AccountStatus;
import tn.matchmakers.userservice.repositories.SessionRepository;
import tn.matchmakers.userservice.repositories.UserRepository;
import tn.matchmakers.userservice.security.JwtService;
import tn.matchmakers.userservice.services.serviceInterfaces.AuthService;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDateTime;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthServiceImpl implements AuthService {
    private static final int MAX_ATTEMPTS = 5;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final SessionRepository sessionRepository;
    private final EmailService emailService;

    // MAIN METHOD
    @Override
    public AuthResponse authenticate(LoginRequest request, DeviceInfo device) {
        String message = "Invalid email or password" ;
        try {
            // check user exist or not
            User user = userRepository.findByEmail(request.email())
                    .orElseThrow(() -> new BadCredentialsException(message));
            // check account status
            checkAccountStatus(user);
            // check password
            validatePassword(request, user);
            // check login
            handleSuccessfulLogin(user, device);
            // générer tokens
            return createAuthResponse(user, device);
        } catch (UsernameNotFoundException e) {
            throw new BadCredentialsException(message);
        }
    }

    //ACCOUNT CHECK
    private void checkAccountStatus(User user) {
        if (!user.isEnabled()) {
            throw new DisabledException("Account is disabled");
        }
        if (user.getAccountStatus() == AccountStatus.LOCKED) {
            throw new DisabledException("Account is locked. Contact administrator.");
        }
    }

    // PASSWORD VALIDATION
    private void validatePassword(LoginRequest request, User user) {
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            handleFailedLoginAttempt(user);
            throw new BadCredentialsException("Invalid credentials");
        }
    }

    // FAILED LOGIN
    private void handleFailedLoginAttempt(User user) {
        user.setFailedLoginAttempts(user.getFailedLoginAttempts() + 1);
        if (user.getFailedLoginAttempts() >= MAX_ATTEMPTS) {
            user.setAccountStatus(AccountStatus.LOCKED);
            user.setLockUntil(LocalDateTime.now().plusHours(24));
        }
        userRepository.save(user);
    }

    // SUCCESSFUL LOGIN
    private void handleSuccessfulLogin(User user, DeviceInfo device) {

        user.setFailedLoginAttempts(0);
        user.setLastLoginAt(LocalDateTime.now());
        user.setLockUntil(null);

        device.setLastUsed(LocalDateTime.now());
        user.getTrustedDevices().add(device);

        userRepository.save(user);
    }

    // TOKEN & SESSION
    private AuthResponse createAuthResponse(User user, DeviceInfo device) {
        // Generate tokens
        String accessToken = jwtService.generateAccessToken(user);
        String refreshToken = jwtService.generateRefreshToken(user);

        // Create session
        Session session = new Session();
        session.setRefreshTokenHash(hashRefreshToken(refreshToken));
        session.setDeviceFingerprintHash(device.getFingerprintHash());
        session.setIpPrefix(device.getIpPrefix());
        session.setExpiresAt(LocalDateTime.now().plusSeconds(jwtService.getRefreshExpirationMs() / 1000));
        session.setUserId(user.getId());
        sessionRepository.save(session);

        // Build response
        return new AuthResponse(
                accessToken,
                refreshToken,
                Instant.now().plusMillis(jwtService.getAccessExpirationMs()),
                Instant.now().plusMillis(jwtService.getRefreshExpirationMs()),
                user.getEmail(),
                user.getRoles().stream()
                        .map(role -> role.getName())
                        .collect(java.util.stream.Collectors.toList()),
                user.getRoles().stream()
                        .flatMap(role -> role.getPermissions().stream())
                        .map(permission -> permission.getName())
                        .collect(java.util.stream.Collectors.toSet())
        );
    }

    // UTILS
    private String hashRefreshToken(String token) {
        return Hashing.sha256().hashString(token, StandardCharsets.UTF_8).toString();
    }

    // FORGOT PASSWORD
    @Override
    public void forgotPassword(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadCredentialsException("Aucun utilisateur trouvé avec cet email"));
        
        String token = java.util.UUID.randomUUID().toString();
        user.setResetPasswordToken(token);
        user.setResetPasswordTokenExpiry(LocalDateTime.now().plusHours(1));
        userRepository.save(user);

        String resetLink = "http://localhost:4200/reset-password?token=" + token;

        try {
            String htmlTemplate = Files.readString(Paths.get("src/main/resources/templates/reset-password-template.html"));
            String emailContent = htmlTemplate
                    .replace("{{email}}", user.getEmail())
                    .replace("{{resetLink}}", resetLink);

            emailService.sendHtmlEmail(user.getEmail(), "Réinitialisation de votre mot de passe MatchMakers", emailContent);
            log.info("Email envoyé avec succès à {}", user.getEmail());
        } catch (IOException e) {
            log.error("Erreur de lecture du template d'email de réinitialisation: {}", e.getMessage());
            log.error(">>>> LIEN DE RECUPERATION GENERÉ POUR TESTS : {}", resetLink);
        } catch (Exception e) {
            log.error("ATTENTION : L'envoi d'email SMTP a échoué (Credentials invalides) : {}", e.getMessage());
            log.error(">>>> LIEN DE RECUPERATION GENERÉ POUR TESTS : {}", resetLink);
        }
    }

    // RESET PASSWORD
    @Override
    public void resetPassword(String token, String newPassword) {
        User user = userRepository.findByResetPasswordToken(token)
                .orElseThrow(() -> new IllegalArgumentException("Token invalide ou expiré"));

        if (user.getResetPasswordTokenExpiry() == null || user.getResetPasswordTokenExpiry().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Le token a expiré");
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setResetPasswordToken(null);
        user.setResetPasswordTokenExpiry(null);
        user.setAccountStatus(AccountStatus.ACTIVE);
        user.setFailedLoginAttempts(0);
        user.setLockUntil(null);
        userRepository.save(user);
    }
}
