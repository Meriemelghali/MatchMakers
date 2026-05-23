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

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class ReclamationServiceImpl implements ReclamationService {

    private final ReclamationRepository reclamationRepository;
    private final SanctionRepository sanctionRepository;
    
    // Config de l'URL IA (par défaut vers le port 8002)
    @Value("${gemini.ai.url:http://localhost:8002}")
    private String geminiAiUrl;

    @Override
    public Reclamation createReclamation(Reclamation reclamation) {
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

        // 3. Gestion Comportement (Sanction Automatique Warning)
        if ("COMPORTEMENT".equals(reclamation.getType()) && reclamation.getTargetUserId() != null) {
            Sanction sanction = Sanction.builder()
                .userId(reclamation.getTargetUserId())
                .typeSanction("WARNING")
                .motif("Signalement comportemental auto-généré.")
                .createdAt(LocalDateTime.now())
                .build();
            // On la sauve après avoir sauvé la réclamation pour avoir l'ID
            Reclamation savedReclamation = reclamationRepository.save(reclamation);
            sanction.setReclamationId(savedReclamation.getId());
            sanctionRepository.save(sanction);
            
            // 4. Détection Joueur Toxique (Plus de 3 plaintes dans les 7 derniers jours)
            LocalDateTime sevenDaysAgo = LocalDateTime.now().minusDays(7);
            int count = reclamationRepository.countByTargetUserIdAndCreatedAtAfter(reclamation.getTargetUserId(), sevenDaysAgo);
            
            if (count >= 3) {
                log.warn("ALERTE TOXICITE: Le joueur {} a reçu {} plaintes récemment.", reclamation.getTargetUserId(), count);
                savedReclamation.setStatus("ALERTE_ADMIN");
                return reclamationRepository.save(savedReclamation);
            }
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
}
