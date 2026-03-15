package tn.matchmakers.userservice.services;

import com.google.common.hash.Hashing;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;
import tn.matchmakers.userservice.entities.DeviceInfo;
import tn.matchmakers.userservice.services.serviceInterfaces.DeviceMetadataService;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;

@Service
public class DeviceMetadataServiceImpl implements DeviceMetadataService {
    @Override
    public DeviceInfo extractDeviceInfo(HttpServletRequest request) {
        try {
            return DeviceInfo.builder()
                    .fingerprintHash(generateDeviceFingerprint(request))
                    .ipPrefix(extractIpPrefix(request.getRemoteAddr()))
                    .browserHash(hashString(request.getHeader("User-Agent")))
                    .firstSeen(LocalDateTime.now())
                    .lastUsed(LocalDateTime.now())
                    .build();
        } catch (Exception e) {
            // Fallback to minimal device info
            return DeviceInfo.builder()
                    .ipPrefix("unknown")
                    .browserHash("unknown")
                    .firstSeen(LocalDateTime.now())
                    .lastUsed(LocalDateTime.now())
                    .build();
        }
    }
    private String generateDeviceFingerprint(HttpServletRequest request) {
        String components = request.getHeader("User-Agent") +
                request.getHeader("Accept-Language");
        return hashString(components);
    }
    private String extractIpPrefix(String fullIp) {
        if (fullIp == null || fullIp.isEmpty()) {
            return "invalid-ip";
        }

        // Handle IPv4
        if (fullIp.contains(".")) {
            int lastDotIndex = fullIp.lastIndexOf('.');
            return lastDotIndex > 0 ? fullIp.substring(0, lastDotIndex) : fullIp;
        }

        // Handle IPv6
        if (fullIp.contains(":")) {
            String[] parts = fullIp.split(":");
            return parts.length >= 3 ?
                    String.join(":", parts[0], parts[1], parts[2]) :
                    fullIp;
        }

        return fullIp;
    }
    private String hashString(String input) {
        return Hashing.sha256()
                .hashString(input, StandardCharsets.UTF_8)
                .toString();
    }
}