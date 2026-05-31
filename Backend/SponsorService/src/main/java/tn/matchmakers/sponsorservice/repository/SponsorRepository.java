package tn.matchmakers.sponsorservice.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;
import tn.matchmakers.sponsorservice.entity.Sponsor;
import tn.matchmakers.sponsorservice.entity.SponsorStatus;
import java.util.List;
import java.util.Optional;

@Repository
public interface SponsorRepository extends MongoRepository<Sponsor, String> {
    Optional<Sponsor>    findByUserId(String userId);
    List<Sponsor>        findByStatus(SponsorStatus status);
    List<Sponsor>        findByTargetSport(String sport);
    boolean              existsByUserId(String userId);
}