package tn.matchmakers.userservice.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.Instant;
import java.util.List;
import java.util.Set;

public record AuthResponse(
        @JsonProperty("accessToken") String accessToken,
        @JsonProperty("refreshToken") String refreshToken,
        @JsonProperty("accessExpiresAt") Instant accessExpiresAt,
        @JsonProperty("refreshExpiresAt") Instant refreshExpiresAt,
        @JsonProperty("email") String email,
        @JsonProperty("roles") List<String> roles,
        @JsonProperty("permissions") Set<String> permissions,
        @JsonProperty("theme") tn.matchmakers.userservice.entities.enums.ThemePreference theme,
        @JsonProperty("requiresMfaChoice") boolean requiresMfaChoice,
        @JsonProperty("requires2FA") boolean requires2FA,
        @JsonProperty("twoFactorType") String twoFactorType,
        @JsonProperty("qrCodeImageBase64") String qrCodeImageBase64
) {
    public static AuthResponse success(
        String accessToken, String refreshToken, Instant accessExp, Instant refreshExp,
        String email, List<String> roles, Set<String> perms, tn.matchmakers.userservice.entities.enums.ThemePreference theme
    ) {
        return new AuthResponse(accessToken, refreshToken, accessExp, refreshExp, email, roles, perms, theme, false, false, null, null);
    }

    public static AuthResponse choiceRequired(String email) {
        return new AuthResponse(null, null, null, null, email, null, null, null, true, false, null, null);
    }
    
    public static AuthResponse mfaRequired(String email, String twoFactorType, String qrCodeImageBase64) {
        return new AuthResponse(null, null, null, null, email, null, null, null, false, true, twoFactorType, qrCodeImageBase64);
    }
}
