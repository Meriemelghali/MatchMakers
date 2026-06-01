package tn.matchmakers.sponsorservice.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;
import tn.matchmakers.sponsorservice.entity.Campaign;
import tn.matchmakers.sponsorservice.entity.CampaignStatus;
import tn.matchmakers.sponsorservice.entity.CampaignTarget;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface CampaignRepository extends MongoRepository<Campaign, String> {
    List<Campaign> findBySponsorId(String sponsorId);
    List<Campaign> findByStatus(CampaignStatus status);
    List<Campaign> findByTargetAndTargetId(CampaignTarget target, String targetId);

    // ✅ Campagnes actives sur une période
    @Query("{ 'status': 'ACTIVE', 'startDate': { $lte: ?0 }, 'endDate': { $gte: ?0 } }")
    List<Campaign> findActiveCampaigns(LocalDateTime now);

    // ✅ Campagnes actives pour un produit
    @Query("{ 'status': 'ACTIVE', 'target': 'PRODUCT', 'targetId': ?0, " +
           "  'startDate': { $lte: ?1 }, 'endDate': { $gte: ?1 } }")
    List<Campaign> findActiveForProduct(String productId, LocalDateTime now);

    // ✅ Campagnes actives GLOBAL
    @Query("{ 'status': 'ACTIVE', 'target': 'GLOBAL', " +
           "  'startDate': { $lte: ?0 }, 'endDate': { $gte: ?0 } }")
    List<Campaign> findActiveGlobal(LocalDateTime now);
}