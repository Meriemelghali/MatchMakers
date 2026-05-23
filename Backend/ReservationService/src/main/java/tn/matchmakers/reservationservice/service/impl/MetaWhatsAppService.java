package tn.matchmakers.reservationservice.service.impl;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import tn.matchmakers.reservationservice.service.NotificationService;

import java.util.HashMap;
import java.util.Map;

@Service("whatsAppService")
@Slf4j
public class MetaWhatsAppService implements NotificationService {

    private final RestTemplate restTemplate;

    @Value("${meta.whatsapp.token:TOKEN_PLACEHOLDER}")
    private String apiToken;

    @Value("${meta.whatsapp.phone-id:ID_PLACEHOLDER}")
    private String phoneNumberId;

    public MetaWhatsAppService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @Override
    public void sendReminder(String phoneNumber, String messageContent) {
        // Meta Cloud API requires phone number without '+' for the payload 'to' field usually, 
        // but it depends on the exact formatting. We'll strip '+' if present.
        String formattedPhone = phoneNumber.startsWith("+") ? phoneNumber.substring(1) : phoneNumber;

        String url = "https://graph.facebook.com/v17.0/" + phoneNumberId + "/messages";

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiToken);

        Map<String, Object> body = new HashMap<>();
        body.put("messaging_product", "whatsapp");
        body.put("to", formattedPhone);
        body.put("type", "text");
        
        Map<String, String> textBody = new HashMap<>();
        textBody.put("body", messageContent);
        body.put("text", textBody);

        try {
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
            restTemplate.postForObject(url, request, String.class);
            log.info("WhatsApp message sent via Meta Cloud API to {}", phoneNumber);
        } catch (Exception e) {
            log.error("Failed to send WhatsApp message to {} via Meta: {}", phoneNumber, e.getMessage());
        }
    }
}
