package tn.matchmakers.rewardservice.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import tn.matchmakers.rewardservice.entity.Reward;

import java.util.List;

public interface RewardRepository extends MongoRepository<Reward, String> {

    // Query derivee Spring Data Mongo:
    // SELECT * FROM rewards WHERE userId = :userId
    List<Reward> findByUserId(String userId);

    // Query derivee Spring Data Mongo:
    // SELECT * FROM rewards WHERE teamId = :teamId
    List<Reward> findByTeamId(String teamId);
}

