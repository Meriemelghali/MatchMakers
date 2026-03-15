package tn.matchmakers.userservice.entities;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class DeviceInfo {
    private String fingerprintHash;
    private String browserHash;
    private String ipPrefix;
    private LocalDateTime firstSeen;
    private LocalDateTime lastUsed;
}
