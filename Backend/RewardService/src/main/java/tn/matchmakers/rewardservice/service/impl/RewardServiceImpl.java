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
        // 1) MapStruct: copie les champs autorises du request vers l'entity Reward.
        //    Les champs sensibles (id, status, progress, timestamps, etc.) sont ignores dans RewardMapper.fromCreate().
        Reward reward = mapper.fromCreate(request);

        // 2) Valeurs par defaut / initialisation serveur.
        reward.setStatus(RewardStatus.ACTIVE);
        if (reward.getLevel() == null) reward.setLevel(1);
        if (reward.getProgress() == null) reward.setProgress(0);
        if (reward.getMaxProgress() == null) reward.setMaxProgress(100);
        if (reward.getEvolutive() == null) reward.setEvolutive(false);

        // 3) Timestamps serveur.
        reward.setCreatedAt(LocalDateTime.now());
        reward.setUpdatedAt(LocalDateTime.now());

        // 4) Sauvegarde Mongo.
        Reward saved = repository.save(reward);

        // 5) Retour DTO (entity -> JSON).
        return mapper.toDto(saved);
    }

    @Override
    public RewardDto update(String id, RewardUpdateRequest request) {
        // 1) Charge la reward, sinon 404.
        Reward reward = repository.findById(id)
                .orElseThrow(() -> new NotFoundException("Recompense introuvable : " + id));

        // 2) Update partiel: chaque champ est applique seulement s'il est non-null dans la requete.
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

        if (request.getUserId() != null) reward.setUserId(request.getUserId());
        if (request.getUsername() != null) reward.setUsername(request.getUsername());
        if (request.getTeamId() != null) reward.setTeamId(request.getTeamId());
        if (request.getTeamName() != null) reward.setTeamName(request.getTeamName());
        if (request.getEventId() != null) reward.setEventId(request.getEventId());

        if (request.getEvolutive() != null) reward.setEvolutive(request.getEvolutive());
        if (request.getMaxProgress() != null) reward.setMaxProgress(request.getMaxProgress());
        if (request.getEvolutionRules() != null) reward.setEvolutionRules(request.getEvolutionRules());
        if (request.getDesign() != null) reward.setDesign(request.getDesign());

        // 3) updatedAt serveur.
        reward.setUpdatedAt(LocalDateTime.now());

        // 4) Save + retour DTO.
        return mapper.toDto(repository.save(reward));
    }

    @Override
    public void delete(String id) {
        // Evite un delete silencieux: si l'id n'existe pas, on renvoie 404.
        if (!repository.existsById(id)) {
            throw new NotFoundException("Recompense introuvable : " + id);
        }
        repository.deleteById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public RewardDto get(String id) {
        // Lecture simple: findById sinon 404, puis mapping entity -> DTO.
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
    public List<RewardDto> getByUser(String userId) {
        return mapper.toDtoList(repository.findByUserId(userId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<RewardDto> getByTeam(String teamId) {
        return mapper.toDtoList(repository.findByTeamId(teamId));
    }
}

