package tn.matchmakers.productservice.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import java.util.Map;

// Appelle exactement l'endpoint existant dans AuthController
@FeignClient(name = "user-service", url = "${user-service.url}")
public interface UserServiceClient {

    @GetMapping("/auth/validate-token")
    Map<String, Object> validateToken(
        @RequestHeader("Authorization") String bearerToken
    );
}
