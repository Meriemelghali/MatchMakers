package tn.matchmakers.userservice.dto;

import tn.matchmakers.userservice.entities.enums.Role;

import java.time.Instant;

public record AuthResponse(
        String accessToken,
        String refreshToken,
        Instant accessExpiresAt,
        Instant refreshExpiresAt,
        String email,
        Role role) {
}
