package tn.matchmakers.rewardservice.repository;

import org.springframework.data.mongodb.repository.MongoRepository;
import tn.matchmakers.rewardservice.entity.Reward;

import java.util.List;

public interface RewardRepository extends MongoRepository<Reward, String> {

    List<Reward> findByUserId(String userId);

    List<Reward> findByTeamId(String teamId);
}

