package tn.matchmakers.rewardservice.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.matchmakers.rewardservice.dto.RewardEvolutionPreviewDto;
import tn.matchmakers.rewardservice.dto.RewardProgressRequest;
import tn.matchmakers.rewardservice.entity.Reward;
import tn.matchmakers.rewardservice.enums.RewardRarity;
import tn.matchmakers.rewardservice.exception.NotFoundException;
import tn.matchmakers.rewardservice.mapper.RewardMapper;
import tn.matchmakers.rewardservice.repository.RewardRepository;
import tn.matchmakers.rewardservice.service.RewardEvolutionNamingService;
import tn.matchmakers.rewardservice.service.RewardEvolutionService;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class RewardEvolutionServiceImpl implements RewardEvolutionService {

    private final RewardRepository repository;
    private final RewardMapper mapper;
    private final RewardEvolutionNamingService namingService;

    @Override
    public RewardEvolutionPreviewDto addProgress(String rewardId, RewardProgressRequest request) {
        Reward reward = repository.findById(rewardId)
                .orElseThrow(() -> new NotFoundException("Recompense introuvable : " + rewardId));

        Reward before = snapshot(reward);

        int delta = request.getDelta() != null ? request.getDelta() : 0;
        if (delta < 0) delta = 0;

        reward.setMaxProgress(normalizeMax(reward.getMaxProgress()));
        reward.setProgress(normalizeProgress(reward.getProgress()) + delta);
        reward.setUpdatedAt(LocalDateTime.now());

        boolean auto = request.getAutoEvolve() == null || request.getAutoEvolve();
        RewardEvolutionPreviewDto result;
        if (auto) {
            result = evolveIfNeeded(reward, before);
        } else {
            Reward saved = repository.save(reward);
            result = new RewardEvolutionPreviewDto(
                    mapper.toDto(mapReward(before, rewardId)),
                    mapper.toDto(saved),
                    false,
                    0,
                    "Progress mis a jour."
            );
        }
        return result;
    }

    @Override
    public RewardEvolutionPreviewDto evolveNow(String rewardId) {
        Reward reward = repository.findById(rewardId)
                .orElseThrow(() -> new NotFoundException("Recompense introuvable : " + rewardId));

        Reward before = snapshot(reward);
        reward.setMaxProgress(normalizeMax(reward.getMaxProgress()));
        reward.setProgress(normalizeProgress(reward.getProgress()));

        return evolveIfNeeded(reward, before);
    }

    private RewardEvolutionPreviewDto evolveIfNeeded(Reward reward, Reward beforeSnapshot) {
        boolean evolutive = Boolean.TRUE.equals(reward.getEvolutive());
        if (!evolutive) {
            Reward saved = repository.save(reward);
            return new RewardEvolutionPreviewDto(
                    mapper.toDto(mapReward(beforeSnapshot, reward.getId())),
                    mapper.toDto(saved),
                    false,
                    0,
                    "Cette recompense n'est pas evolutive."
            );
        }

        int max = normalizeMax(reward.getMaxProgress());
        int progress = normalizeProgress(reward.getProgress());

        if (progress < max) {
            Reward saved = repository.save(reward);
            return new RewardEvolutionPreviewDto(
                    mapper.toDto(mapReward(beforeSnapshot, reward.getId())),
                    mapper.toDto(saved),
                    false,
                    0,
                    "Progress insuffisant pour evoluer."
            );
        }

        int levelsGained = 0;
        int level = normalizeLevel(reward.getLevel());

        // Spec: reset progress on level up.
        while (progress >= max) {
            levelsGained += 1;
            level += 1;
            progress = 0;
            max = nextMaxProgress(max, reward.getEvolutionRules());
        }

        reward.setLevel(level);
        reward.setProgress(progress);
        reward.setMaxProgress(max);
        bumpPower(reward, levelsGained);
        reward.setRarity(pickRarity(reward));

        if (shouldRenameWithAi(reward.getEvolutionRules())) {
            Optional<Reward> named = namingService.suggestEvolvedNaming(reward);
            named.ifPresent(n -> {
                reward.setName(n.getName());
                reward.setDescription(n.getDescription());
                reward.setAwardedBy(n.getAwardedBy());
            });
        }

        reward.setUpdatedAt(LocalDateTime.now());
        Reward saved = repository.save(reward);

        return new RewardEvolutionPreviewDto(
                mapper.toDto(mapReward(beforeSnapshot, reward.getId())),
                mapper.toDto(saved),
                true,
                levelsGained,
                "Evolution appliquee."
        );
    }

    private void bumpPower(Reward reward, int levelsGained) {
        int base = reward.getPoints() != null ? reward.getPoints() : 0;
        int perLevel = getIntRule(reward.getEvolutionRules(), "pointsPerLevel").orElse(10);
        int gained = Math.max(0, levelsGained) * Math.max(0, perLevel);
        reward.setPoints(base + gained);
    }

    private RewardRarity pickRarity(Reward reward) {
        int level = normalizeLevel(reward.getLevel());
        if (level >= 7) return RewardRarity.LEGENDARY;
        if (level >= 5) return RewardRarity.EPIC;
        if (level >= 3) return RewardRarity.RARE;
        return RewardRarity.COMMON;
    }

    private boolean shouldRenameWithAi(Map<String, Object> rules) {
        // default true when evolutive
        Object v = rules != null ? rules.get("renameWithAi") : null;
        if (v == null) return true;
        if (v instanceof Boolean b) return b;
        return "true".equalsIgnoreCase(v.toString().trim());
    }

    private int nextMaxProgress(int currentMax, Map<String, Object> rules) {
        int step = getIntRule(rules, "maxProgressStep").orElse(20);
        int next = currentMax + Math.max(0, step);
        return Math.min(Math.max(20, next), 10_000);
    }

    private Optional<Integer> getIntRule(Map<String, Object> rules, String key) {
        if (rules == null) return Optional.empty();
        Object v = rules.get(key);
        if (v == null) return Optional.empty();
        try {
            return Optional.of(Integer.parseInt(v.toString().trim()));
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    private int normalizeMax(Integer max) {
        if (max == null || max < 20) return 100;
        return Math.min(max, 10_000);
    }

    private int normalizeProgress(Integer progress) {
        if (progress == null || progress < 0) return 0;
        return Math.min(progress, 1_000_000);
    }

    private int normalizeLevel(Integer level) {
        if (level == null || level < 1) return 1;
        return Math.min(level, 1_000_000);
    }

    private Reward snapshot(Reward r) {
        return Reward.builder()
                .id(r.getId())
                .name(r.getName())
                .type(r.getType())
                .description(r.getDescription())
                .dateAwarded(r.getDateAwarded())
                .points(r.getPoints())
                .rarity(r.getRarity())
                .status(r.getStatus())
                .imageUrl(r.getImageUrl())
                .awardedBy(r.getAwardedBy())
                .revokedReason(r.getRevokedReason())
                .userId(r.getUserId())
                .username(r.getUsername())
                .teamId(r.getTeamId())
                .teamName(r.getTeamName())
                .eventId(r.getEventId())
                .level(r.getLevel())
                .progress(r.getProgress())
                .maxProgress(r.getMaxProgress())
                .evolutive(r.getEvolutive())
                .evolutionRules(r.getEvolutionRules())
                .createdAt(r.getCreatedAt())
                .updatedAt(r.getUpdatedAt())
                .build();
    }

    private Reward mapReward(Reward snapshot, String id) {
        if (snapshot.getId() == null) snapshot.setId(id);
        return snapshot;
    }
}

