package tn.matchmakers.reservationservice.service.impl;

import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import tn.matchmakers.reservationservice.service.NotificationService;

@Service("smsService")
@Slf4j
public class TwilioSmsService implements NotificationService {

    @Value("${twilio.account.sid:AC_PLACEHOLDER}")
    private String accountSid;

    @Value("${twilio.auth.token:TOKEN_PLACEHOLDER}")
    private String authToken;

    @Value("${twilio.phone.number:+1234567890}")
    private String fromPhoneNumber;

    @PostConstruct
    public void init() {
        if (!"AC_PLACEHOLDER".equals(accountSid)) {
            Twilio.init(accountSid, authToken);
            System.out.println("🚀 [NOTIFICATION] Twilio SMS Service initialized successfully.");
            log.info("Twilio initialized with account SID: {}", accountSid);
        }
    }

    @Override
    public void sendReminder(String phoneNumber, String messageContent) {
        try {
            Message message = Message.creator(
                    new PhoneNumber(phoneNumber),
                    new PhoneNumber(fromPhoneNumber),
                    messageContent
            ).create();
            log.info("SMS sent via Twilio to {}. SID: {}", phoneNumber, message.getSid());
        } catch (Exception e) {
            log.error("Failed to send SMS to {} via Twilio: {}", phoneNumber, e.getMessage());
        }
    }
}
