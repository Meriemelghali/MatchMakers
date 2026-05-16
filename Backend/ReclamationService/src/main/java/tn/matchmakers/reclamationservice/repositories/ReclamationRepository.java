package tn.matchmakers.reclamationservice.repositories;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import tn.matchmakers.reclamationservice.entities.Reclamation;
import java.util.List;

@Repository
public interface ReclamationRepository extends MongoRepository<Reclamation, String> {
    List<Reclamation> findByUserId(String userId);
    List<Reclamation> findByStatus(String status);
    
    // Nouveaux ajouts pour la toxicité et le dashboard
    List<Reclamation> findByTargetUserId(String targetUserId);
    int countByTargetUserIdAndCreatedAtAfter(String targetUserId, java.time.LocalDateTime date);
}
