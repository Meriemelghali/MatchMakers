package tn.matchmakers.productservice.util;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Component
public class TokenExtractor {

    public String extractBearerToken() {
        ServletRequestAttributes attrs =
            (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();

        if (attrs == null)
            throw new RuntimeException("Aucune requête HTTP en cours");

        HttpServletRequest request = attrs.getRequest();
        String header = request.getHeader("Authorization");

        if (header == null || !header.startsWith("Bearer "))
            throw new RuntimeException("Token JWT manquant");

        return header; // "Bearer xxxxx"
    }
}
