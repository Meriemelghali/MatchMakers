package tn.matchmakers.userservice.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.Getter;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import tn.matchmakers.userservice.entities.User;

import java.security.Key;
import java.util.Date;
import java.util.function.Function;

@Service
@Getter
public class JwtService {
    @Value("${jwt.secret-key}")
    private String secretKey;

    @Value("${jwt.access-expiration}")
    private long accessExpirationMs;

    @Value("${jwt.refresh-expiration}")
    private long refreshExpirationMs;

    private Key getSigningKey() {
        byte[] keyBytes = Decoders.BASE64.decode(secretKey);
        return Keys.hmacShaKeyFor(keyBytes);
    }

    // Generate access token
    public String generateAccessToken(User user) {
        return buildToken(user, accessExpirationMs);
    }

    // Generate refresh token
    public String generateRefreshToken(User user) {
        return buildToken(user, refreshExpirationMs);
    }

    private String buildToken(User user, long expiration) {
        return Jwts.builder()
                .setSubject(user.getId())
                .claim("email", user.getEmail())
                .claim("firstName", user.getFirstName())
                .claim("lastName", user.getLastName())
                .claim("roles", user.getRoles().stream()
                        .map(role -> role.getName())
                        .collect(java.util.stream.Collectors.toList()))
                .claim("permissions", user.getRoles().stream()
                        .flatMap(role -> role.getPermissions().stream())
                        .map(permission -> permission.getName())
                        .collect(java.util.stream.Collectors.toSet()))
                .claim("tokenVersion", user.getTokenVersion()) // Critical for invalidation
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + expiration))
                .signWith(getSigningKey(), SignatureAlgorithm.HS256)
                .compact();
    }
    public String extractUserId(String token) {
        return extractClaim(token, Claims::getSubject);
    }
    private <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }
    private Claims extractAllClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }
    public boolean isTokenValid(String token, User user) {
        final String userId = extractUserId(token);
        final Integer tokenVersion = extractClaim(token, claims -> claims.get("tokenVersion", Integer.class));

        return userId.equals(user.getId())
                && !isTokenExpired(token)
                && tokenVersion.equals(user.getTokenVersion());
    }
    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }
}
