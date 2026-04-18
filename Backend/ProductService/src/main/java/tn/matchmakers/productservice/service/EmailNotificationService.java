package tn.matchmakers.productservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import tn.matchmakers.productservice.dto.OrderResponseDTO;
import tn.matchmakers.productservice.dto.PaymentResponseDTO;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailNotificationService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.from:noreply@matchmakers.tn}")
    private String fromEmail;

    @Async
    public void sendOrderConfirmation(String userEmail, String userFullName, OrderResponseDTO order) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(userEmail);
            message.setSubject("Confirmation de votre commande #" + order.getId());
            message.setText(buildOrderConfirmationBody(userFullName, order));
            mailSender.send(message);
            log.info("Email de confirmation de commande envoyé à {}", userEmail);
        } catch (Exception e) {
            log.error("Erreur lors de l'envoi de l'email de confirmation à {}: {}", userEmail, e.getMessage());
        }
    }

    @Async
    public void sendOrderCancelled(String userEmail, String userFullName, OrderResponseDTO order) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(userEmail);
            message.setSubject("Annulation de votre commande #" + order.getId());
            message.setText(buildOrderCancelledBody(userFullName, order));
            mailSender.send(message);
            log.info("Email d'annulation de commande envoyé à {}", userEmail);
        } catch (Exception e) {
            log.error("Erreur lors de l'envoi de l'email d'annulation à {}: {}", userEmail, e.getMessage());
        }
    }

    @Async
    public void sendPaymentConfirmed(String userEmail, String userFullName, OrderResponseDTO order) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(userEmail);
            message.setSubject("Paiement confirmé - Commande #" + order.getId());
            message.setText(buildPaymentConfirmedBody(userFullName, order));
            mailSender.send(message);
            log.info("Email de confirmation de paiement envoyé à {}", userEmail);
        } catch (Exception e) {
            log.error("Erreur lors de l'envoi de l'email de paiement à {}: {}", userEmail, e.getMessage());
        }
    }

    private String buildOrderConfirmationBody(String fullName, OrderResponseDTO order) {
        return String.format(
            "Bonjour %s,\n\n" +
            "Merci pour votre commande !\n\n" +
            "Détails de la commande:\n" +
            "- Numéro: %s\n" +
            "- Produit: %s\n" +
            "- Quantité: %d\n" +
            "- Montant total: %.2f TND\n" +
            "- Statut: %s\n\n" +
            "Nous vous remercions de votre confiance.\n\n" +
            "Cordialement,\nL'équipe MatchMakers",
            fullName, order.getId(), order.getProductName(), order.getQuantity(), 
            order.getTotalPrice(), order.getStatus()
        );
    }

    private String buildOrderCancelledBody(String fullName, OrderResponseDTO order) {
        return String.format(
            "Bonjour %s,\n\n" +
            "Votre commande a été annulée.\n\n" +
            "Détails de la commande:\n" +
            "- Numéro: %s\n" +
            "- Produit: %s\n" +
            "- Statut: %s\n\n" +
            "Si vous avez des questions, n'hésitez pas à nous contacter.\n\n" +
            "Cordialement,\nL'équipe MatchMakers",
            fullName, order.getId(), order.getProductName(), order.getStatus()
        );
    }

    private String buildPaymentConfirmedBody(String fullName, OrderResponseDTO order) {
        return String.format(
            "Bonjour %s,\n\n" +
            "Votre paiement a été confirmé avec succès !\n\n" +
            "Détails de la commande:\n" +
            "- Numéro: %s\n" +
            "- Produit: %s\n" +
            "- Montant: %.2f TND\n" +
            "- Statut: %s\n\n" +
            "Votre commande est en cours de traitement.\n\n" +
            "Cordialement,\nL'équipe MatchMakers",
            fullName, order.getId(), order.getProductName(), order.getTotalPrice(), 
            order.getStatus()
        );
    }
}
