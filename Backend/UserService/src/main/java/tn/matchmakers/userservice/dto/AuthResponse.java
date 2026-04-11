package tn.matchmakers.userservice.dto;

import java.time.Instant;
import java.util.List;
import java.util.Set;

public record AuthResponse(
        String accessToken,
        String refreshToken,
        Instant accessExpiresAt,
        Instant refreshExpiresAt,
        String email,
        List<String> roles,
        Set<String> permissions,
        tn.matchmakers.userservice.entities.enums.ThemePreference theme) {
}
