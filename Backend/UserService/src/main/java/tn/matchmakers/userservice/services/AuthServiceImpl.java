package tn.matchmakers.userservice.services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
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

import tn.matchmakers.userservice.entities.enums.TwoFactorType;
import tn.matchmakers.userservice.dto.Setup2FaRequest;
import tn.matchmakers.userservice.dto.Verify2FaRequest;

// TOTP imports
import dev.samstevens.totp.secret.DefaultSecretGenerator;
import dev.samstevens.totp.qr.QrData;
import dev.samstevens.totp.qr.ZxingPngQrGenerator;
import dev.samstevens.totp.time.SystemTimeProvider;
import dev.samstevens.totp.code.DefaultCodeGenerator;
import dev.samstevens.totp.code.HashingAlgorithm;
import dev.samstevens.totp.util.Utils;

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

        User user = userRepository.findByEmail(request.email())
                .orElseThrow(() -> new BadCredentialsException(message));
        
        checkAccountStatus(user);
        validatePassword(request, user);
            
        // Handle 2FA : Always ask for choice if mandatory (dynamic 2FA choice)
        log.info("2FA Dynamic Choice triggered for user: {}", user.getEmail());
        return AuthResponse.choiceRequired(user.getEmail());
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
        return AuthResponse.success(
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
                        .collect(java.util.stream.Collectors.toSet()),
                user.getTheme()
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

    // --- 2FA LOGIC ---
    @Override
    public AuthResponse setup2Fa(Setup2FaRequest request, DeviceInfo device) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BadCredentialsException("User not found"));
        validatePasswordForRequest(request.getPassword(), user);

        if (request.getType().equals("EMAIL")) {
            user.setTwoFactorType(TwoFactorType.EMAIL);
            generateAndSendEmailOTP(user);
            return AuthResponse.mfaRequired(user.getEmail(), "EMAIL", null);
        } else if (request.getType().equals("AUTH_APP")) {
            user.setTwoFactorType(TwoFactorType.AUTH_APP);
            
            // On génère toujours un nouveau secret pour forcer la resynchronisation
            // lors de la configuration du QR Code.
            dev.samstevens.totp.secret.SecretGenerator tempSecretGenerator = new DefaultSecretGenerator();
            String secret = tempSecretGenerator.generate();
            user.setTotpSecret(secret);
            userRepository.save(user);

            log.info("New TOTP Secret generated for user: {}", user.getEmail());

            QrData data = new QrData.Builder()
                .label(user.getEmail())
                .secret(secret)
                .issuer("MatchMakers")
                .algorithm(HashingAlgorithm.SHA1)
                .digits(6)
                .period(30)
                .build();
                
            dev.samstevens.totp.qr.QrGenerator generator = new ZxingPngQrGenerator();
            try {
                byte[] imageData = generator.generate(data);
                String mimeType = generator.getImageMimeType();
                String dataUri = Utils.getDataUriForImage(imageData, mimeType);
                return AuthResponse.mfaRequired(user.getEmail(), "AUTH_APP", dataUri);
            } catch (Exception e) {
                throw new RuntimeException("Error generating QR Code");
            }
        }
        throw new IllegalArgumentException("Invalid 2FA Type");
    }

    @Override
    public AuthResponse verifySetup2Fa(Verify2FaRequest request, DeviceInfo device) {
        return verify2Fa(request, device);
    }

    @Override
    public AuthResponse verify2Fa(Verify2FaRequest request, DeviceInfo device) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BadCredentialsException("User not found"));
        validatePasswordForRequest(request.getPassword(), user);

        boolean isValid = false;
        
        // On utilise le type envoyé (AUTH_APP ou EMAIL) ou celui de la DB par défaut
        String activeType = (request.getType() != null) ? request.getType() : user.getTwoFactorType().name();
        
        log.info("Verifying 2FA for user: {} | Request Type: {} | DB Type: {} | Final Type: {}", 
                user.getEmail(), request.getType(), user.getTwoFactorType(), activeType);

        if ("EMAIL".equals(activeType)) {
            if (user.getTwoFactorCode() == null || user.getTwoFactorCodeExpiry() == null || user.getTwoFactorCodeExpiry().isBefore(LocalDateTime.now())) {
                log.warn("Email OTP expired or missing for user: {}", user.getEmail());
                throw new BadCredentialsException("Code expiré ou manquant");
            }
            if (user.getTwoFactorCode().equals(request.getCode())) {
                isValid = true;
                user.setTwoFactorCode(null);
                user.setTwoFactorCodeExpiry(null);
            }
        } else if ("AUTH_APP".equals(activeType)) {
            // Nettoyage du code : suppression des espaces et tirets éventuels
            String cleanCode = request.getCode().replaceAll("\\s+", "").replace("-", "");
            
            log.info("Verifying TOTP for user: {} | Server Time: {} | Code Length: {}", 
                    user.getEmail(), LocalDateTime.now(), cleanCode.length());
            
            dev.samstevens.totp.time.TimeProvider timeProvider = new SystemTimeProvider();
            dev.samstevens.totp.code.CodeGenerator codeGenerator = new DefaultCodeGenerator();
            
            dev.samstevens.totp.code.DefaultCodeVerifier verifier = new dev.samstevens.totp.code.DefaultCodeVerifier(codeGenerator, timeProvider);
            // verifier.setAllowedTimePeriod(1); // Suspendu temporairement pour cause de conflit de version
            
            isValid = verifier.isValidCode(user.getTotpSecret(), cleanCode);
            log.info("TOTP verification result for {} (Secret start: {}): {}", 
                    user.getEmail(), (user.getTotpSecret() != null ? user.getTotpSecret().substring(0, 4) : "NULL"), isValid);
        }

        if (!isValid) {
            log.warn("Invalid 2FA code attempt for user: {} (Expected Type: {})", user.getEmail(), activeType);
            throw new BadCredentialsException("Code 2FA invalide");
        }

        // 2FA passed, do successful login behavior
        handleSuccessfulLogin(user, device);
        return createAuthResponse(user, device);
    }

    private void validatePasswordForRequest(String passwordInput, User user) {
        if (!passwordEncoder.matches(passwordInput, user.getPasswordHash())) {
            throw new BadCredentialsException("Invalid password");
        }
    }

    private void generateAndSendEmailOTP(User user) {
        String code = String.format("%06d", new java.util.Random().nextInt(999999));
        user.setTwoFactorCode(code);
        user.setTwoFactorCodeExpiry(LocalDateTime.now().plusMinutes(10));
        userRepository.save(user);

        // Envoyer le code par email
        String body = "<div style=\"font-family:Arial;color:#333;\"><div style=\"text-align:center;padding:20px;\"><h1 style=\"color:#E8500A;\">MatchMakers</h1><p>Voici votre code de vérification pour vous connecter à votre espace.</p><h2 style=\"background:#eee;padding:15px;letter-spacing:5px;\">" + code + "</h2><p>Ce code expirera dans 10 minutes.</p></div></div>";
        try {
            emailService.sendHtmlEmail(user.getEmail(), "Code de vérification MatchMakers", body);
            log.info("2FA OTP sent to {}", user.getEmail());
        } catch(Exception e) {
            log.error("Erreur lors de l'envoi de l'OTP: {}", e.getMessage());
            log.error(">>>> CODE OTP GENERE : {}", code);
        }
    }
}
