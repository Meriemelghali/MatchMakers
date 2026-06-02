package tn.matchmakers.reclamationservice.services;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import tn.matchmakers.reclamationservice.entities.Reclamation;
import tn.matchmakers.reclamationservice.entities.Sanction;
import tn.matchmakers.reclamationservice.repositories.ReclamationRepository;
import tn.matchmakers.reclamationservice.repositories.SanctionRepository;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReclamationServiceImpl implements ReclamationService {

    private final ReclamationRepository reclamationRepository;
    private final SanctionRepository sanctionRepository;
    private final EmailService emailService;
    
    // Config de l'URL IA (par défaut vers le port 8002)
    @Value("${gemini.ai.url:http://localhost:8002}")
    private String geminiAiUrl;

    @Override
    public Reclamation createReclamation(Reclamation reclamation) {
        if (reclamation.getStatus() == null) {
            reclamation.setStatus("PENDING");
        }
        reclamation.setCreatedAt(LocalDateTime.now());
        reclamation.setUpdatedAt(LocalDateTime.now());
        reclamation.setStatus("PENDING");
        
        // 1. Classification via l'IA
        try {
            WebClient webClient = WebClient.create(geminiAiUrl);
            Map<String, String> requestBody = Map.of("description", reclamation.getDescription());
            
            Map<String, Object> response = webClient.post()
                    .uri("/reclamation-analyze")
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .block();
                    
            if (response != null) {
                reclamation.setType((String) response.getOrDefault("type", "TECHNIQUE"));
                reclamation.setUrgence((String) response.getOrDefault("urgence", "MOYENNE"));
                reclamation.setAiResponse((String) response.get("reponse_auto"));
            }
        } catch (Exception e) {
            log.error("Erreur lors de l'appel à l'IA pour classification", e);
            reclamation.setType("TECHNIQUE");
            reclamation.setUrgence("MOYENNE");
            reclamation.setAiResponse("Votre demande a bien été reçue. Nous la traitons manuellement.");
        }

        // 2. Résolution Automatique
        if ("PAIEMENT".equals(reclamation.getType()) && reclamation.getDescription().toLowerCase().contains("absent")) {
            // Remboursement simulé
            log.info("Remboursement automatique simulé pour le motif: joueur absent (Match: {})", reclamation.getMatchId());
            reclamation.setStatus("AUTO_RESOLVED");
        }

        // 3. Gestion Comportement (Système de Sanction Progressive)
        if ("COMPORTEMENT".equals(reclamation.getType())) {
            if (reclamation.getTargetUserId() == null || reclamation.getTargetUserId().trim().isEmpty()) {
                throw new IllegalArgumentException("Merci de remplir le champ cible (Joueur) pour un problème de comportement.");
            }

            String targetId = reclamation.getTargetUserId().trim();
            boolean userExists = false;

            // --- NOUVEAU : Résolution d'identité par Nom/Username ---
            try {
                final String queryId = targetId;
                WebClient userServiceClient = WebClient.create("http://localhost:8081/users/users");
                Map<String, Object> userRes = userServiceClient.get()
                        .uri(uriBuilder -> uriBuilder.path("/search")
                                .queryParam("query", queryId)
                                .build())
                        .retrieve()
                        .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                        .timeout(Duration.ofSeconds(2))
                        .block();
                
                if (userRes != null && userRes.get("id") != null) {
                    targetId = (String) userRes.get("id");
                    reclamation.setTargetUserId(targetId); // On met à jour avec la vraie ID
                    userExists = true;
                }
            } catch (Exception e) {
                log.warn("Impossible de résoudre l'ID pour la cible: {}. Utilisation du texte brut.", targetId);
            }

            if (!userExists) {
                // Double vérification si targetId ressemble à un ID (24 chars) mais n'a pas été trouvé par nom
                if (targetId.length() != 24) {
                    throw new RuntimeException("Cet utilisateur n'existe pas.");
                }
            }

            final String finalTargetId = targetId;
            List<Sanction> previousSanctions = sanctionRepository.findByUserId(finalTargetId);

            Sanction sanction = Sanction.builder()
                .userId(finalTargetId)
                .createdAt(LocalDateTime.now())
                .build();

            LocalDateTime sixtyDaysAgo = LocalDateTime.now().minusDays(60);
            long recentSanctionCount = previousSanctions.stream()
                    .filter(s -> s.getCreatedAt().isAfter(sixtyDaysAgo))
                    .count();

            log.info("Sanctions récentes (60 jours) pour {}: {}", finalTargetId, recentSanctionCount);

            if (recentSanctionCount == 0) {
                // 1ère sanction dans les 60 jours: Avertissement
                sanction.setTypeSanction("WARNING");
                String msg = "Avertissement formel pour comportement inapproprié. Merci de respecter la charte MatchMakers.";
                sanction.setMotif(msg);
                notifyUserService(finalTargetId, msg, "WARNING", -100);
            } else if (recentSanctionCount == 1) {
                // 2ème sanction dans les 60 jours: Retrait Score
                sanction.setTypeSanction("SCORE_DEDUCTION");
                String msg = "Deuxième signalement en moins de 60 jours. Retrait de 250 points de Fair-Play.";
                sanction.setMotif(msg);
                notifyUserService(finalTargetId, msg, "DEDUCTION", -250);
            } else {
                // 3ème+ sanction dans les 60 jours: BAN
                sanction.setTypeSanction("BAN_DEFINITIF");
                String msg = "Troisième signalement en moins de 60 jours. Bannissement définitif de la plateforme.";
                sanction.setMotif(msg);
                notifyUserService(finalTargetId, msg, "BAN", -500);
                reclamation.setStatus("ALERTE_ADMIN");
            }

            Reclamation savedReclamation = reclamationRepository.save(reclamation);
            sanction.setReclamationId(savedReclamation.getId());
            sanctionRepository.save(sanction);
            
            return savedReclamation;
        }

        return reclamationRepository.save(reclamation);
    }

    @Override
    public Reclamation updateReclamation(String id, Reclamation reclamationDetails) {
        Reclamation existingReclamation = getReclamationById(id);
        existingReclamation.setTitle(reclamationDetails.getTitle());
        existingReclamation.setDescription(reclamationDetails.getDescription());
        existingReclamation.setStatus(reclamationDetails.getStatus());
        existingReclamation.setAdminComment(reclamationDetails.getAdminComment());
        existingReclamation.setUpdatedAt(LocalDateTime.now());
        return reclamationRepository.save(existingReclamation);
    }

    @Override
    public Reclamation getReclamationById(String id) {
        return reclamationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Reclamation not found with id: " + id));
    }

    @Override
    public List<Reclamation> getAllReclamations() {
        return reclamationRepository.findAll();
    }

    @Override
    public List<Reclamation> getReclamationsByUserId(String userId) {
        return reclamationRepository.findByUserId(userId);
    }

    @Override
    public void deleteReclamation(String id) {
        reclamationRepository.deleteById(id);
    }

    @Override
    public void createSanction(Sanction sanction) {
        sanction.setCreatedAt(LocalDateTime.now());
        sanctionRepository.save(sanction);
    }

    @Override
    public void resolveReclamation(String id, String adminComment) {
        Reclamation reclamation = getReclamationById(id);
        reclamation.setStatus("RESOLVED");
        reclamation.setAdminComment(adminComment);
        reclamation.setUpdatedAt(LocalDateTime.now());
        reclamationRepository.save(reclamation);

        // --- ENVOI D'EMAIL DE NOTIFICATION ---
        String userEmail = getUserEmail(reclamation.getUserId());
        if (userEmail != null) {
            sendResolutionEmail(userEmail, reclamation);
        }
    }

    private String getUserEmail(String userId) {
        try {
            Map<String, Object> userRes = WebClient.create("http://localhost:8081/users/users")
                    .get()
                    .uri("/{id}", userId)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .timeout(Duration.ofSeconds(2))
                    .block();
            if (userRes != null && userRes.get("email") != null) {
                return (String) userRes.get("email");
            }
        } catch (Exception e) {
            log.error("Impossible de récupérer l'email pour l'utilisateur {}: {}", userId, e.getMessage());
        }
        return null;
    }

    private void sendResolutionEmail(String email, Reclamation reclamation) {
        String comment = reclamation.getAdminComment();
        String subject = "Résolution de votre réclamation MatchMakers : " + reclamation.getTitle();
        
        StringBuilder htmlBody = new StringBuilder();
        htmlBody.append("<div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; padding: 30px; background-color: #ffffff;'>");
        htmlBody.append("<div style='text-align: center; margin-bottom: 30px;'>");
        htmlBody.append("<h2 style='color: #e8500a; margin: 0;'>MatchMakers Support</h2>");
        htmlBody.append("<p style='color: #64748b; font-size: 14px;'>Service de médiation & Qualité</p>");
        htmlBody.append("</div>");
        
        htmlBody.append("<p>Bonjour,</p>");
        htmlBody.append("<p>Votre réclamation concernant <strong>\"").append(reclamation.getTitle()).append("\"</strong> a été traitée avec succès.</p>");
        
        // --- VISUAL VOUCHER / CARD ---
        if (comment.toLowerCase().contains("bon") || comment.toLowerCase().contains("achat")) {
            htmlBody.append("<div style='margin: 30px 0; background: linear-gradient(135deg, #e8500a 0%, #ff783d 100%); border-radius: 16px; color: white; padding: 0; overflow: hidden; box-shadow: 0 10px 20px rgba(232, 80, 10, 0.2);'>");
            htmlBody.append("<div style='padding: 20px; border-bottom: 2px dashed rgba(255,255,255,0.3); text-align: center;'>");
            htmlBody.append("<span style='text-transform: uppercase; letter-spacing: 2px; font-size: 12px; opacity: 0.9;'>Bon d'achat MatchMakers Store</span>");
            htmlBody.append("<h1 style='margin: 10px 0; font-size: 48px;'>15 DT</h1>");
            htmlBody.append("</div>");
            htmlBody.append("<div style='padding: 20px; text-align: center; background: rgba(0,0,0,0.1);'>");
            htmlBody.append("<p style='margin: 0 0 10px 0; font-size: 14px; opacity: 0.8;'>Utilisez le code suivant lors de votre commande :</p>");
            htmlBody.append("<div style='background: white; color: #e8500a; padding: 10px 20px; border-radius: 8px; display: inline-block; font-family: monospace; font-size: 24px; font-weight: bold; border: 2px solid #e8500a;'>MM-LOYALTY-15</div>");
            htmlBody.append("</div>");
            htmlBody.append("</div>");
        } else if (comment.toLowerCase().contains("réservation") || comment.toLowerCase().contains("terrain")) {
            htmlBody.append("<div style='margin: 30px 0; background: linear-gradient(135deg, #10b981 0%, #34d399 100%); border-radius: 16px; color: white; padding: 0; overflow: hidden; box-shadow: 0 10px 20px rgba(16, 185, 129, 0.2);'>");
            htmlBody.append("<div style='padding: 20px; border-bottom: 2px dashed rgba(255,255,255,0.3); text-align: center;'>");
            htmlBody.append("<span style='text-transform: uppercase; letter-spacing: 2px; font-size: 12px; opacity: 0.9;'>Pass MatchMakers Terrain</span>");
            htmlBody.append("<h1 style='margin: 10px 0; font-size: 36px;'>SESSION OFFERTE</h1>");
            htmlBody.append("</div>");
            htmlBody.append("<div style='padding: 20px; text-align: center;'>");
            htmlBody.append("<p style='margin: 0;'>Valable pour n'importe quel créneau disponible via l'application.</p>");
            htmlBody.append("</div>");
            htmlBody.append("</div>");
        } else if (comment.toLowerCase().contains("parking")) {
             htmlBody.append("<div style='margin: 30px 0; background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%); border-radius: 16px; color: white; padding: 0; overflow: hidden; box-shadow: 0 10px 20px rgba(59, 130, 246, 0.2);'>");
            htmlBody.append("<div style='padding: 20px; border-bottom: 2px dashed rgba(255,255,255,0.3); text-align: center;'>");
            htmlBody.append("<span style='text-transform: uppercase; letter-spacing: 2px; font-size: 12px; opacity: 0.9;'>Accès MatchMakers Parking</span>");
            htmlBody.append("<h1 style='margin: 10px 0; font-size: 36px;'>PARKING PREMIUM</h1>");
            htmlBody.append("</div>");
            htmlBody.append("<div style='padding: 20px; text-align: center;'>");
            htmlBody.append("<p style='margin: 0;'>Votre accès prioritaire a été activé pour 1 mois.</p>");
            htmlBody.append("</div>");
            htmlBody.append("</div>");
        } else {
            htmlBody.append("<div style='background: #f8fafc; border-left: 4px solid #e8500a; padding: 20px; margin: 30px 0; border-radius: 4px;'>");
            htmlBody.append("<p style='margin: 0; font-weight: bold; color: #1e293b;'>Décision de l'administration :</p>");
            htmlBody.append("<p style='margin: 10px 0 0 0; color: #334155; line-height: 1.5;'>").append(comment).append("</p>");
            htmlBody.append("</div>");
        }

        htmlBody.append("<p style='color: #64748b; font-size: 14px; line-height: 1.5;'>Note : Vous pouvez consulter l'historique complet de vos réclamations et le suivi de vos avantages directement sur votre profil utilisateur MatchMakers.</p>");
        
        htmlBody.append("<div style='margin-top: 40px; padding-top: 20px; border-top: 1px solid #f1f5f9; text-align: center;'>");
        htmlBody.append("<p style='color: #94a3b8; font-size: 12px;'>Merci de votre confiance. À bientôt sur les terrains !</p>");
        htmlBody.append("<p style='font-weight: bold; color: #e8500a;'>L'équipe MatchMakers</p>");
        htmlBody.append("</div>");
        htmlBody.append("</div>");

        emailService.sendHtmlEmail(email, subject, htmlBody.toString());
    }

    private void notifyUserService(String userId, String message, String type, int points) {
        log.info("Notification UserService pour {}: type={}, points={}", userId, type, points);
        try {
            WebClient.create("http://localhost:8081/users/api/ai")
                    .post()
                    .uri(uriBuilder -> uriBuilder.path("/sanction/{userId}")
                            .queryParam("message", message)
                            .queryParam("type", type)
                            .queryParam("points", points)
                            .build(userId))
                    .retrieve()
                    .toBodilessEntity()
                    .timeout(Duration.ofSeconds(5))
                    .block();
            log.info("Notification envoyée avec succès pour {}", userId);
        } catch (Exception e) {
            log.error("ÉCHEC de la notification UserService pour {}: {}", userId, e.getMessage());
        }
    }
}
