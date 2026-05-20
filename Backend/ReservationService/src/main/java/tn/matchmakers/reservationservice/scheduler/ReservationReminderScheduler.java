package tn.matchmakers.reservationservice.scheduler;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import tn.matchmakers.reservationservice.entities.Reservation;
import tn.matchmakers.reservationservice.repository.ReservationRepository;
import tn.matchmakers.reservationservice.service.NotificationService;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Component
@Slf4j
@RequiredArgsConstructor
public class ReservationReminderScheduler {

    private final ReservationRepository reservationRepository;
    private final RestTemplate restTemplate;

    @Qualifier("smsService")
    private final NotificationService smsService;

    @Qualifier("whatsAppService")
    private final NotificationService whatsAppService;

    @Value("${twilio.enabled:true}")
    private boolean twilioEnabled;

    @Value("${meta.whatsapp.enabled:true}")
    private boolean whatsappEnabled;

    @Scheduled(fixedRate = 60000) // Every 60 seconds
    public void sendUpcomingReservationReminders() {
        LocalDateTime now = LocalDateTime.now();
        // Look for reservations starting between 29 and 59 minutes from now
        LocalDateTime reminderWindowStart = now.plusMinutes(29);
        LocalDateTime reminderWindowEnd = now.plusMinutes(59);

        log.info("Checking for reservations starting between {} and {}", reminderWindowStart, reminderWindowEnd);

        List<Reservation> upcoming = reservationRepository.findByStartTimeRBetweenAndReminderSentFalse(
                reminderWindowStart, reminderWindowEnd);

        if (upcoming.isEmpty()) {
            log.info("--- [REMINDER CHECK] No reservations found for the current window ---");
            return;
        }

        System.out.println("\n--- 🔔 MATCHMAKERS NOTIFICATION ENGINE: STARTING REMINDER BATCH ---");
        log.info("Found {} reservations requiring reminders in the window", upcoming.size());

        for (Reservation res : upcoming) {
            try {
                System.out.println("Processing Reservation: " + res.getId() + " | User: " + res.getIdUser());
                
                String phone = getUserPhone(res.getIdUser());
                if (phone == null || phone.isBlank()) {
                    log.warn("❌ [USER_DATA_ERROR] Could not find phone number for user {}. Skipping and marking as processed.", res.getIdUser());
                    res.setReminderSent(true);
                    reservationRepository.save(res);
                    continue;
                }

                // Fetch details via REST API from owner services
                String terrainName = getTerrainName(res.getTerrainId());
                String sportName = getSportName(res.getSportId());
                long minutesRemaining = java.time.temporal.ChronoUnit.MINUTES.between(now, res.getStartTimeR());

                String message = String.format(
                    "⚽ Rappel MatchMakers: Votre partie de %s approche !\n" +
                    "📍 Terrain: %s\n" +
                    "⏰ Heure: %s\n" +
                    "Détails: Préparez-vous, le coup d'envoi est dans %d minutes. À bientôt !",
                    sportName,
                    terrainName,
                    res.getStartTimeR().toLocalTime().toString(),
                    minutesRemaining
                );

                System.out.println(">>> Attempting dispatch to: " + phone);
                System.out.println("this is the message "+message);
                System.out.println("Message Content: " + message);
                
                // 1. SMS Channel
                if (twilioEnabled) {
                    try {
                        smsService.sendReminder(phone, message);
                        System.out.println("✅ SMS Channel: Dispatched successfully");
                    } catch (Exception e) {
                        log.error("❌ SMS Channel: Failed for reservation {}: {}", res.getId(), e.getMessage());
                    }
                } else {
                    System.out.println("⏭️ SMS Channel: SKIPPED (Disabled in config)");
                }

                // 2. WhatsApp Channel
                if (whatsappEnabled) {
                    try {
                        whatsAppService.sendReminder(phone, message);
                        System.out.println("✅ WhatsApp Channel: Dispatched successfully");
                    } catch (Exception e) {
                        log.error("❌ WhatsApp Channel: Failed for reservation {}: {}", res.getId(), e.getMessage());
                    }
                } else {
                    System.out.println("⏭️ WhatsApp Channel: SKIPPED (Disabled in config)");
                }

                // Mark as sent
                res.setReminderSent(true);
                reservationRepository.save(res);
                System.out.println("--- Reservation " + res.getId() + " marked as REMINDED ---\n");

            } catch (Exception e) {
                log.error("🛑 [GLOBAL_ERROR] processing reminder for reservation {}: {}", res.getId(), e.getMessage());
            }
        }
        System.out.println("--- 🔔 MATCHMAKERS NOTIFICATION ENGINE: BATCH COMPLETED ---\n");
    }

    private String getUserPhone(String userId) {
        String url = "http://localhost:8081/users/users/" + userId;
        try {
            System.out.println("[REST] Calling UserService: " + url);
            Map user = restTemplate.getForObject(url, Map.class);
            if (user != null) {
                System.out.println("[REST] User Response: " + user);
                return (String) user.get("phoneNumber");
            }
        } catch (Exception e) {
            System.err.println("[REST_ERROR] UserService (" + url + "): " + e.getMessage());
        }
        return null;
    }

    private String getTerrainName(String terrainId) {
        String url = "http://localhost:8088/terrain/" + terrainId;
        try {
            System.out.println("[REST] Calling TerrainService: " + url);
            Map terrain = restTemplate.getForObject(url, Map.class);
            if (terrain != null) {
                System.out.println("[REST] Terrain Response: " + terrain);
                // Check both "nom" and "nameTerrain" to be safe
                String name = (String) terrain.get("nom");
                if (name == null) name = (String) terrain.get("nameTerrain");
                return name != null ? name : "Terrain";
            }
        } catch (Exception e) {
            System.err.println("[REST_ERROR] TerrainService (" + url + "): " + e.getMessage());
        }
        return "Terrain";
    }

    private String getSportName(String sportId) {
        String url = "http://localhost:8084/sports/api/sports/" + sportId;
        try {
            System.out.println("[REST] Calling SportService: " + url);
            Map sport = restTemplate.getForObject(url, Map.class);
            if (sport != null) {
                System.out.println("[REST] Sport Response: " + sport);
                String name = (String) sport.get("nameSport");
                return name != null ? name : "Sport";
            }
        } catch (Exception e) {
            System.err.println("[REST_ERROR] SportService (" + url + "): " + e.getMessage());
        }
        return "Sport";
    }
}
