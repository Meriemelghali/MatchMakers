package tn.matchmakers.reclamationservice.services;

import tn.matchmakers.reclamationservice.entities.Reclamation;
import java.util.List;

public interface ReclamationService {
    Reclamation createReclamation(Reclamation reclamation);
    Reclamation updateReclamation(String id, Reclamation reclamation);
    Reclamation getReclamationById(String id);
    List<Reclamation> getAllReclamations();
    List<Reclamation> getReclamationsByUserId(String userId);
    void deleteReclamation(String id);
}
