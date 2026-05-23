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
        // 1) Charger la recompense depuis Mongo (sinon 404).
        Reward reward = repository.findById(rewardId)
                .orElseThrow(() -> new NotFoundException("Recompense introuvable : " + rewardId));

        // 2) Snapshot "before" (pour renvoyer au front un diff before/after propre).
        Reward before = snapshot(reward);

        // 3) Delta de progression (defaut 0, et clamp >= 0).
        int delta = request.getDelta() != null ? request.getDelta() : 0;
        if (delta < 0) delta = 0;

        // 4) Normalise les compteurs et applique la progression.
        reward.setMaxProgress(normalizeMax(reward.getMaxProgress()));
        reward.setProgress(normalizeProgress(reward.getProgress()) + delta);
        reward.setUpdatedAt(LocalDateTime.now());

        // 5) Auto-evolution: par defaut true si null.
        boolean auto = request.getAutoEvolve() == null || request.getAutoEvolve();
        RewardEvolutionPreviewDto result;
        if (auto) {
            // 5.a) Si auto => tente une evolution si progress atteint le max.
            result = evolveIfNeeded(reward, before);
        } else {
            // 5.b) Sinon => on sauvegarde seulement la progression.
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
        // 1) Charger la recompense (sinon 404).
        Reward reward = repository.findById(rewardId)
                .orElseThrow(() -> new NotFoundException("Recompense introuvable : " + rewardId));

        // 2) Snapshot before.
        Reward before = snapshot(reward);
        // 3) Normalisation avant evolution.
        reward.setMaxProgress(normalizeMax(reward.getMaxProgress()));
        reward.setProgress(normalizeProgress(reward.getProgress()));

        // 4) Tente l'evolution.
        return evolveIfNeeded(reward, before);
    }

    private RewardEvolutionPreviewDto evolveIfNeeded(Reward reward, Reward beforeSnapshot) {
        // 1) La recompense doit etre evolutive pour level-up.
        boolean evolutive = Boolean.TRUE.equals(reward.getEvolutive());
        if (!evolutive) {
            // Si non evolutive: on sauvegarde la progression normalisee, mais aucun level-up.
            Reward saved = repository.save(reward);
            return new RewardEvolutionPreviewDto(
                    mapper.toDto(mapReward(beforeSnapshot, reward.getId())),
                    mapper.toDto(saved),
                    false,
                    0,
                    "Cette recompense n'est pas evolutive."
            );
        }

        // 2) Lire max/progress normalises.
        int max = normalizeMax(reward.getMaxProgress());
        int progress = normalizeProgress(reward.getProgress());

        // 3) Si progress insuffisant: pas d'evolution.
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

        // 4) Sinon: on applique l'evolution (potentiellement plusieurs levels si progress tres grand).
        int levelsGained = 0;
        int level = normalizeLevel(reward.getLevel());

        // Spec: reset progress on level up.
        while (progress >= max) {
            levelsGained += 1;
            level += 1;
            progress = 0;
            max = nextMaxProgress(max, reward.getEvolutionRules());
        }

        // 5) Ecrit les nouvelles valeurs sur l'entity.
        reward.setLevel(level);
        reward.setProgress(progress);
        reward.setMaxProgress(max);

        // 6) Met a jour la "puissance" (points) et la rarete selon le niveau.
        bumpPower(reward, levelsGained);
        reward.setRarity(pickRarity(reward));

        // 7) Optionnel: renommer via IA apres evolution (rule renameWithAi).
        if (shouldRenameWithAi(reward.getEvolutionRules())) {
            Optional<Reward> named = namingService.suggestEvolvedNaming(reward);
            named.ifPresent(n -> {
                reward.setName(n.getName());
                reward.setDescription(n.getDescription());
                reward.setAwardedBy(n.getAwardedBy());
            });
        }

        // 8) Save final + retour preview.
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

