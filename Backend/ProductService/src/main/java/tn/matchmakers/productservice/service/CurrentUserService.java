package tn.matchmakers.productservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import tn.matchmakers.productservice.client.UserServiceClient;
import tn.matchmakers.productservice.util.TokenExtractor;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class CurrentUserService {

    private final UserServiceClient userServiceClient;
    private final TokenExtractor tokenExtractor;

    // Appelle /auth/validate-token et retourne toutes les infos
    public Map<String, Object> getCurrentUserInfo() {
        String token = tokenExtractor.extractBearerToken();
        return userServiceClient.validateToken(token);
        // retourne : { id, email, firstName, lastName, roles, permissions }
    }

    public String getCurrentUserEmail() {
        return (String) getCurrentUserInfo().get("email");
    }

    public String getCurrentUserFullName() {
        Map<String, Object> info = getCurrentUserInfo();
        return info.get("firstName") + " " + info.get("lastName");
    }

    public String getCurrentUserId() {
        return (String) getCurrentUserInfo().get("id");
    }
}
