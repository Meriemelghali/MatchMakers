package tn.matchmakers.rewardservice.service;

import tn.matchmakers.rewardservice.dto.RewardAIGenerateRequest;
import tn.matchmakers.rewardservice.dto.RewardAISuggestionDto;

import java.util.List;

public interface RewardAIService {
    List<RewardAISuggestionDto> generateRewards(RewardAIGenerateRequest request);
}

