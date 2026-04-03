package tn.matchmakers.userservice.controllers;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.matchmakers.userservice.dto.AuthResponse;
import tn.matchmakers.userservice.dto.LoginRequest;
import tn.matchmakers.userservice.dto.UserCreateDto;
import tn.matchmakers.userservice.dto.UserResponseDto;
import tn.matchmakers.userservice.dto.ForgotPasswordRequest;
import tn.matchmakers.userservice.dto.ResetPasswordRequest;
import tn.matchmakers.userservice.entities.DeviceInfo;
import tn.matchmakers.userservice.security.JwtService;
import tn.matchmakers.userservice.services.UserServiceImpl;
import tn.matchmakers.userservice.services.serviceInterfaces.AuthService;
import tn.matchmakers.userservice.services.serviceInterfaces.DeviceMetadataService;
import tn.matchmakers.userservice.services.serviceInterfaces.UserService;

import java.util.Map;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:4200", "http://localhost:8080"})

public class AuthController {
    private final UserService userService;
    private final UserServiceImpl userServiceImpl;
    private final AuthService authService;
    private final JwtService jwtService;
    private final DeviceMetadataService deviceMetadataService;

    @PostMapping("/create")
    public ResponseEntity<UserResponseDto> createUser(@Valid @RequestBody UserCreateDto userCreateDto) {
        UserResponseDto response = userService.createUser(userCreateDto);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest
    ) {
        // extract device information
        DeviceInfo device = deviceMetadataService.extractDeviceInfo(httpRequest);
        return ResponseEntity.ok(authService.authenticate(request, device));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, String>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request.getEmail());
        return ResponseEntity.ok(Map.of("message", "E-mail de réinitialisation envoyé si l'adresse existe."));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request.getToken(), request.getNewPassword());
        return ResponseEntity.ok(Map.of("message", "Mot de passe réinitialisé avec succès."));
    }

    @GetMapping("/validate-token")
    public ResponseEntity<?> validateToken(@RequestHeader("Authorization") String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Token manquant ou mal formé");
        }

        String token = authHeader.substring(7); // retirer "Bearer "

        // Récupérer l'utilisateur depuis le token
        String userId = jwtService.extractUserId(token);
        var user = userServiceImpl.getUserById(userId); // méthode à créer ou déjà existante

        // Vérifier la validité du token
        if (!jwtService.isTokenValid(token, user)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Token invalide ou expiré");
        }

        // Retourner toutes les infos nécessaires
        return ResponseEntity.ok(Map.of(
                "id", user.getId(),
                "email", user.getEmail(),
                "firstName", user.getFirstName(),
                "lastName", user.getLastName(),
                "roles", user.getRoles().stream()
                        .map(role -> role.getName())
                        .collect(java.util.stream.Collectors.toList()),
                "permissions", user.getRoles().stream()
                        .flatMap(role -> role.getPermissions().stream())
                        .map(permission -> permission.getName())
                        .collect(java.util.stream.Collectors.toSet())
        ));
    }
}