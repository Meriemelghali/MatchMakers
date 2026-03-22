package tn.matchmakers.rewardservice.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.matchmakers.rewardservice.dto.*;
import tn.matchmakers.rewardservice.entity.Reward;
import tn.matchmakers.rewardservice.enums.RewardStatus;
import tn.matchmakers.rewardservice.exception.NotFoundException;
import tn.matchmakers.rewardservice.mapper.RewardMapper;
import tn.matchmakers.rewardservice.repository.RewardRepository;
import tn.matchmakers.rewardservice.service.RewardService;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class RewardServiceImpl implements RewardService {

    private final RewardRepository repository;
    private final RewardMapper mapper;

    @Override
    public RewardDto create(RewardCreateRequest request) {
        Reward reward = mapper.fromCreate(request);
        reward.setStatus(RewardStatus.ACTIVE);
        reward.setCreatedAt(LocalDateTime.now());
        reward.setUpdatedAt(LocalDateTime.now());
        Reward saved = repository.save(reward);
        return mapper.toDto(saved);
    }

    @Override
    public RewardDto update(String id, RewardUpdateRequest request) {
        Reward reward = repository.findById(id)
                .orElseThrow(() -> new NotFoundException("Recompense introuvable : " + id));

        if (request.getName() != null) reward.setName(request.getName());
        if (request.getType() != null) reward.setType(request.getType());
        if (request.getDescription() != null) reward.setDescription(request.getDescription());
        if (request.getDateAwarded() != null) reward.setDateAwarded(request.getDateAwarded());

        if (request.getPoints() != null) reward.setPoints(request.getPoints());
        if (request.getRarity() != null) reward.setRarity(request.getRarity());
        if (request.getStatus() != null) reward.setStatus(request.getStatus());
        if (request.getImageUrl() != null) reward.setImageUrl(request.getImageUrl());
        if (request.getAwardedBy() != null) reward.setAwardedBy(request.getAwardedBy());
        if (request.getRevokedReason() != null) reward.setRevokedReason(request.getRevokedReason());

        if (request.getPlayerId() != null) reward.setPlayerId(request.getPlayerId());
        if (request.getPlayerName() != null) reward.setPlayerName(request.getPlayerName());
        if (request.getTeamId() != null) reward.setTeamId(request.getTeamId());
        if (request.getTeamName() != null) reward.setTeamName(request.getTeamName());
        if (request.getEventId() != null) reward.setEventId(request.getEventId());

        reward.setUpdatedAt(LocalDateTime.now());
        return mapper.toDto(repository.save(reward));
    }

    @Override
    public void delete(String id) {
        if (!repository.existsById(id)) {
            throw new NotFoundException("Recompense introuvable : " + id);
        }
        repository.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public RewardDto get(String id) {
        Reward reward = repository.findById(id)
                .orElseThrow(() -> new NotFoundException("Recompense introuvable : " + id));
        return mapper.toDto(reward);
    }

    @Override
    @Transactional(readOnly = true)
    public List<RewardDto> getAll() {
        return mapper.toDtoList(repository.findAll());
    }

    @Override
    @Transactional(readOnly = true)
    public List<RewardDto> getByPlayer(String playerId) {
        return mapper.toDtoList(repository.findByPlayerId(playerId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<RewardDto> getByTeam(String teamId) {
        return mapper.toDtoList(repository.findByTeamId(teamId));
    }
}

