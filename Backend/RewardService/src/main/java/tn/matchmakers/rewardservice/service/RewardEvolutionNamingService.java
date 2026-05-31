package tn.matchmakers.rewardservice.service;

import tn.matchmakers.rewardservice.entity.Reward;

import java.util.Optional;

public interface RewardEvolutionNamingService {
    Optional<Reward> suggestEvolvedNaming(Reward reward);
}

