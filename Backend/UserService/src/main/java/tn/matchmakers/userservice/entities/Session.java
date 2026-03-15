package tn.matchmakers.userservice.entities;

import lombok.*;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "sessions")
@Getter
@Setter
@EqualsAndHashCode(callSuper = true)
@ToString(callSuper = true)
@NoArgsConstructor
public class Session extends BaseEntity {
    @Indexed(unique = true)
    private String refreshTokenHash;

    @Indexed(name = "session_expiry_ttl", expireAfter = "7d") // 7 days
    private LocalDateTime expiresAt;

    private String deviceFingerprintHash;
    private String ipPrefix; // First 3 octets
    private boolean revoked;

    private String userId;
}
