package tn.matchmakers.rewardservice.service;

import tn.matchmakers.rewardservice.dto.RewardEvolutionPreviewDto;
import tn.matchmakers.rewardservice.dto.RewardProgressRequest;

public interface RewardEvolutionService {
    RewardEvolutionPreviewDto addProgress(String rewardId, RewardProgressRequest request);

    RewardEvolutionPreviewDto evolveNow(String rewardId);
}

