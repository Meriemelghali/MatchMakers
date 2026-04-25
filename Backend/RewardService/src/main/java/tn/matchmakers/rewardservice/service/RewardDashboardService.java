package tn.matchmakers.rewardservice.service;

import tn.matchmakers.rewardservice.dto.RewardDashboardDto;

public interface RewardDashboardService {
    RewardDashboardDto getDashboard(String teamId, String q, String type, String rarity, String status);
}

