package tn.matchmakers.reservationservice.service;

public interface NotificationService {
    void sendReminder(String phoneNumber, String message);
}
