package tn.matchmakers.rewardservice.service;

import tn.matchmakers.rewardservice.dto.*;

import java.util.List;

public interface RewardService {

    RewardDto create(RewardCreateRequest request);

    RewardDto update(String id, RewardUpdateRequest request);

    void delete(String id);

    RewardDto get(String id);

    List<RewardDto> getAll();

    List<RewardDto> getByPlayer(String playerId);

    List<RewardDto> getByTeam(String teamId);
}

