package tn.matchmakers.reclamationservice.services;

import tn.matchmakers.reclamationservice.entities.Reclamation;
import tn.matchmakers.reclamationservice.entities.Sanction;
import java.util.List;

public interface ReclamationService {
    Reclamation createReclamation(Reclamation reclamation);
    Reclamation updateReclamation(String id, Reclamation reclamation);
    Reclamation getReclamationById(String id);
    List<Reclamation> getAllReclamations();
    List<Reclamation> getReclamationsByUserId(String userId);
    void deleteReclamation(String id);
    
    // Nouvelles méthodes pour le dashboard admin
    void createSanction(Sanction sanction);
    void resolveReclamation(String id, String adminComment);
}
